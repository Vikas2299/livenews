#!/usr/bin/env python3
"""
thumbnail_pick.py — optimized single thumbnail per cluster.

✅ Reads clusters.json with members containing absolute "path" or ("source","filename")
✅ Extracts image URLs from Markdown files:
   - 'Images: [ ... ]' header lists
   - Markdown ![]() or <img> tags
   - Common front-matter keys like image:, thumbnail:, cover:, og_image:
✅ Scores all found images (filetype preference, hero/featured hints, estimated size)
✅ Downloads only ONE best image per cluster
✅ Saves it as out/thumbs/cluster_covers/cluster_<cluster_id>.jpg

Usage:
  pip install requests pillow
  python thumbnail_pick.py \
      --articles-dir fastapi/scraped_articles \
      --clusters-json fastapi/cluster_output/clusters.json \
      --out-dir fastapi/out/thumbs
"""

import argparse, csv, io, json, re, sys
from pathlib import Path
from collections import defaultdict
from urllib.parse import urlparse

import requests
from PIL import Image, UnidentifiedImageError

# ---------------- CONFIG ----------------
UA = "ThumbnailPick/2.0 (+local)"
RANGE_BYTES = 65536
TIMEOUT = 12
BAD_SUBSTR = ["gravatar","placeholder","emoji","pixel","beacon","base64","data:image"]
EXT_PREF   = {".jpg": 4, ".jpeg": 4, ".png": 3, ".webp": 3, ".gif": 1, ".bmp": 1}
HINT_BONUS = [("hero",3),("featured",3),("og:",3),("open-graph",3),("opengraph",3)]
NEG_HINTS  = [("thumb",-1),("small",-1),("icon",-2),("sprite",-3)]

# ---------------- REGEX EXTRACTORS ----------------
IMG_MD   = re.compile(r'!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)')
IMG_HTML = re.compile(r'<img[^>]+src=["\']([^"\']+)["\']', re.I)
IMG_KEYS = re.compile(
    r'^\s*(?:'
    r'image_url|imageUrl|image|main_image|mainImage|'
    r'featured_image|featuredImage|thumbnail_url|thumbnail|thumb|'
    r'cover|cover_image|meta_image|metaImage|og_image|og:image'
    r')\s*[:=]\s*(https?://\S+)', re.I | re.M
)
IMAGES_LINE = re.compile(r'(?mi)^\s*Images\s*:\s*\[(.*?)\]\s*')
URL_IN_TEXT = re.compile(r'https?://[^\s\'"\]]+')

# ---------------- UTILITIES ----------------
def extract_image_urls(text: str):
    """Extract image URLs from Markdown text and headers."""
    urls = []
    urls += IMG_MD.findall(text)
    urls += IMG_HTML.findall(text)
    urls += [m.group(1) for m in IMG_KEYS.finditer(text)]
    for m in IMAGES_LINE.finditer(text):
        block = m.group(1)
        urls += URL_IN_TEXT.findall(block)
    seen, out = set(), []
    for u in urls:
        if not u:
            continue
        ul = u.strip()
        if ul and ul not in seen and is_usable_url(ul):
            seen.add(ul)
            out.append(ul)
    return out

def is_usable_url(u: str) -> bool:
    lu = u.lower()
    if not lu.startswith(("http://","https://")):
        return False
    return not any(s in lu for s in BAD_SUBSTR)

def ext_of(u: str) -> str:
    p = urlparse(u).path.lower()
    for e in (".jpg",".jpeg",".png",".webp",".gif",".bmp"):
        if p.endswith(e):
            return e
    return ""

# ---- small-range probe to sniff dimensions ----
def fetch_head_bytes(url: str, nbytes=RANGE_BYTES, timeout=TIMEOUT):
    try:
        r = requests.get(
            url,
            headers={"User-Agent": UA, "Range": f"bytes=0-{nbytes-1}"},
            timeout=timeout,
            stream=True,
            allow_redirects=True,
        )
        r.raise_for_status()
        ctype = (r.headers.get("Content-Type") or "").lower()
        if ctype and "image" not in ctype:
            return None
        data = b""
        for chunk in r.iter_content(16384):
            data += chunk
            if len(data) >= nbytes:
                break
        return data if data else None
    except requests.RequestException:
        return None

def sniff_dims(data: bytes):
    if not data:
        return None
    # PNG
    if data.startswith(b"\x89PNG\r\n\x1a\n") and len(data) >= 24:
        return int.from_bytes(data[16:20],"big"), int.from_bytes(data[20:24],"big")
    # GIF
    if data[:6] in (b"GIF87a", b"GIF89a") and len(data) >= 10:
        return int.from_bytes(data[6:8], "little"), int.from_bytes(data[8:10], "little")
    # WEBP
    if data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        if data[12:16] == b"VP8X" and len(data) >= 30:
            w = 1 + int.from_bytes(data[24:27], "little")
            h = 1 + int.from_bytes(data[27:30], "little")
            return (w, h)
    # JPEG: scan to SOF
    if data[:2] == b"\xff\xd8":
        i = 2
        while i + 9 < len(data):
            if data[i] != 0xFF:
                i += 1
                continue
            while i < len(data) and data[i] == 0xFF:
                i += 1
            if i >= len(data):
                break
            marker = data[i]; i += 1
            if i + 1 >= len(data):
                break
            seglen = int.from_bytes(data[i:i+2], "big")
            if 0xC0 <= marker <= 0xC3 or 0xC5 <= marker <= 0xC7 or 0xC9 <= marker <= 0xCB or 0xCD <= marker <= 0xCF:
                if i + 5 < len(data):
                    h = int.from_bytes(data[i+3:i+5], "big")
                    w = int.from_bytes(data[i+5:i+7], "big")
                    return (w, h)
                break
            i += seglen
    return None

def score_candidate(url: str, dims):
    s = EXT_PREF.get(ext_of(url), 2)
    lu = url.lower()
    for k, b in HINT_BONUS:
        if k in lu: s += b
    for k, b in NEG_HINTS:
        if k in lu: s += b
    if dims:
        w, h = dims
        s += (w * h) / 250000.0
    return s

def download_and_save(url: str, out_path: Path):
    try:
        r = requests.get(url, headers={"User-Agent": UA}, timeout=20, stream=True, allow_redirects=True)
        r.raise_for_status()
        im = Image.open(io.BytesIO(r.content)); im.load()
        if im.mode in ("RGBA","LA"):
            bg = Image.new("RGB", im.size, (255,255,255)); bg.paste(im, mask=im.split()[-1]); im = bg
        elif im.mode not in ("RGB","L"):
            im = im.convert("RGB")
        out_path.parent.mkdir(parents=True, exist_ok=True)
        im.save(out_path, format="JPEG", quality=85, optimize=True)
        return True
    except (requests.RequestException, UnidentifiedImageError, OSError):
        return False

# ---------------- CLUSTER LOGIC ----------------
def choose_cluster_cover(member_paths):
    """Pick best image across Markdown files in a cluster."""
    seen = set()
    best = None
    for md_path in member_paths:
        try:
            txt = Path(md_path).read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        for u in extract_image_urls(txt):
            if u in seen or not is_usable_url(u):
                continue
            seen.add(u)
            head = fetch_head_bytes(u)
            dims = sniff_dims(head) if head else None
            sc = score_candidate(u, dims)
            best = max(best, (sc, u, dims), key=lambda t: t[0]) if best else (sc, u, dims)
    return None if not best else {"url": best[1], "dims": best[2]}

# ---------------- MAIN ----------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--articles-dir", required=True)
    ap.add_argument("--clusters-json", required=True)
    ap.add_argument("--assignments-csv", default=None)
    ap.add_argument("--out-dir", default="out/thumbs")
    args = ap.parse_args()

    articles_dir = Path(args.articles_dir)
    out_dir = Path(args.out_dir)
    covers_dir = out_dir / "cluster_covers"
    covers_dir.mkdir(parents=True, exist_ok=True)

    # --- build cluster -> [Path(...)] using filename/path from clusters.json
    cluster_members: dict[str, list[Path]] = defaultdict(list)
    cj = Path(args.clusters_json)

    try:
        raw = json.loads(cj.read_text(encoding="utf-8"))
        def add_member_path(cid, member):
            if isinstance(member, dict):
                p = member.get("path")
                if p:
                    cluster_members[str(cid)].append(Path(p))
                    return
                src = member.get("source")
                fn  = member.get("filename")
                if src and fn:
                    cluster_members[str(cid)].append(articles_dir / src / fn)
            else:
                cluster_members[str(cid)].append(articles_dir / str(member))

        if isinstance(raw, list):
            for c in raw:
                cid = c.get("cluster_id") or c.get("id") or c.get("clusterId")
                if not cid:
                    continue
                members = c.get("members") or c.get("articles") or c.get("items") or []
                for m in members:
                    add_member_path(cid, m)
        elif isinstance(raw, dict):
            for cid, members in raw.items():
                for m in (members or []):
                    add_member_path(cid, m)
    except Exception as e:
        print("invalid clusters.json", e, file=sys.stderr)
        sys.exit(1)

    # dedup and verify paths
    for cid, paths in list(cluster_members.items()):
        uniq = []
        seen = set()
        for p in paths:
            q = Path(str(p))
            if q.exists():
                s = str(q.resolve())
                if s not in seen:
                    seen.add(s)
                    uniq.append(Path(s))
        cluster_members[cid] = uniq

    index = []
    for cid, member_paths in cluster_members.items():
        if not member_paths:
            continue
        pick = choose_cluster_cover(member_paths)
        if not pick:
            continue
        dst = covers_dir / f"cluster_{cid}.jpg"
        if download_and_save(pick["url"], dst):
            w, h = (pick["dims"] or (None, None))
            index.append({
                "cluster_id": cid,
                "url": pick["url"],
                "cover_path": str(dst),
                "width": w,
                "height": h
            })

    (out_dir / "cluster_covers.json").write_text(json.dumps(index, indent=2), encoding="utf-8")
    print(f"Covers saved: {len(index)} | {out_dir/'cluster_covers.json'}")

if __name__ == "__main__":
    main()
