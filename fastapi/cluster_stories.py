#!/usr/bin/env python3
"""
Cluster scraped Markdown articles by breaking story across sources.

- Reads:  livenews\fastapi\scraped_articles\**\*.md
- Clusters by semantic similarity (SBERT) + time proximity (hours window)
- Outputs:
    - clusters.json        (machine-friendly)
    - clusters_summary.md  (human-friendly)
    - cluster_assignments.csv (per-article mapping)

Usage (from repo root or fastapi/):
    python fastapi/cluster_stories.py
    # or tweak thresholds:
    python fastapi/cluster_stories.py --sim 0.78 --hours 72 --min 2
"""

import os
import re
import json
import math
import argparse
from pathlib import Path
from datetime import datetime, timezone, timedelta
from dateutil import parser as dtparser
from typing import List, Dict, Any, Tuple, Optional

import numpy as np
import pandas as pd
import networkx as nx
from tqdm import tqdm
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer

# ----------- CONFIG (defaults; overridable by CLI) -----------
ROOT = Path(__file__).parent / "scraped_articles"
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"  # small, fast, good quality
SIM_THRESHOLD = 0.78          # cosine similarity to link nodes
TIME_WINDOW_HOURS = 72        # only link if within this many hours
MIN_CLUSTER_SIZE = 2          # drop singletons unless you set to 1
MAX_TEXT_CHARS = 1500         # how much of the content to embed (speed-up)

HEADER_SPLIT = "=" * 80  # your MD files split meta and content with 80 '='

# ----------- UTILITIES -----------
def parse_md(path: Path) -> Optional[Dict[str, Any]]:
    """
    Parse your Markdown format:
    Title: ...
    URL: ...
    Source: ...
    Published: ...
    Scraped: ...
    Method: ...
    ================================================================================
    <content>
    """
    try:
        raw = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return None

    parts = raw.split(HEADER_SPLIT, 1)
    meta_block = parts[0]
    content = parts[1].strip() if len(parts) > 1 else ""

    meta: Dict[str, str] = {}
    for line in meta_block.splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip()

    # dates
    pub_dt = None
    for key in ("Published", "Scraped"):
        if meta.get(key):
            try:
                pub_dt = dtparser.parse(meta[key])
                if pub_dt.tzinfo is None:
                    pub_dt = pub_dt.replace(tzinfo=timezone.utc)
                break
            except Exception:
                pass
    # fallback to file mtime
    if pub_dt is None:
        try:
            ts = path.stat().st_mtime
            pub_dt = datetime.fromtimestamp(ts, tz=timezone.utc)
        except Exception:
            pub_dt = datetime(1970, 1, 1, tzinfo=timezone.utc)

    title = meta.get("Title", "Untitled").strip()
    url = meta.get("URL", "").strip()
    source = meta.get("Source", path.parent.name)

    return {
        "title": title,
        "url": url,
        "source": source,
        "published": pub_dt.isoformat(),
        "published_dt": pub_dt,
        "content": content,
        "path": str(path),
        "filename": path.name,
    }

def normalize_title_key(t: str) -> str:
    """Quick exact/near-exact title key for trivial merges."""
    t = t.lower()
    t = re.sub(r"[^a-z0-9\s]", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    # drop wire fluff
    t = re.sub(r"\b(breaking|update|live|exclusive)\b", "", t).strip()
    return t

def build_corpus(root: Path) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    for p in root.rglob("*.md"):
        rec = parse_md(p)
        if rec and rec.get("content"):
            items.append(rec)
    return items

def text_for_embed(rec: Dict[str, Any]) -> str:
    """What we embed: title + first chunk of content (keeps speed high)."""
    body = rec["content"][:MAX_TEXT_CHARS]
    return f"{rec['title']}\n\n{body}"

def representative_title(cluster_indices: List[int], items: List[Dict[str, Any]], embs: np.ndarray) -> str:
    """Pick the article whose embedding is closest to the cluster centroid."""
    cluster_vecs = embs[cluster_indices]
    centroid = cluster_vecs.mean(axis=0, keepdims=True)
    sims = cosine_similarity(cluster_vecs, centroid).ravel()
    best_idx = cluster_indices[int(np.argmax(sims))]
    return items[best_idx]["title"]

# ----------- MAIN CLUSTERING -----------
def cluster(items: List[Dict[str, Any]],
            sim_threshold: float,
            time_window_hours: int,
            min_cluster_size: int,
            model_name: str) -> Tuple[List[Dict[str, Any]], pd.DataFrame]:
    if not items:
        return [], pd.DataFrame()

    model = SentenceTransformer(model_name)
    texts = [text_for_embed(x) for x in items]
    embs = model.encode(texts, batch_size=64, show_progress_bar=True, normalize_embeddings=True)
    n = len(items)

    # Pre-link exact/near-exact titles to help graph connectivity
    title_key_map: Dict[str, List[int]] = {}
    for i, it in enumerate(items):
        k = normalize_title_key(it["title"])
        title_key_map.setdefault(k, []).append(i)

    G = nx.Graph()
    G.add_nodes_from(range(n))

    # Time window matrix (cheap pruning)
    pub_ts = np.array([x["published_dt"].timestamp() for x in items])
    # For speed, use blockwise checks; here we do a simple O(n^2) with pruning on time
    # If your corpus grows huge, switch to FAISS/ANN.
    max_dt = time_window_hours * 3600

    # First, connect exact/near-equal titles unconditionally
    for group in title_key_map.values():
        if len(group) > 1:
            for i in range(len(group)):
                for j in range(i+1, len(group)):
                    G.add_edge(group[i], group[j], reason="titlekey")

    # Then add similarity edges within the time window
    # We can speed by sorting by time
    order = np.argsort(pub_ts)
    for idx_a in tqdm(range(n), desc="Linking by sim+time"):
        a = order[idx_a]
        # expand to neighbors within time window
        # scan forward
        for idx_b in range(idx_a + 1, n):
            b = order[idx_b]
            if pub_ts[b] - pub_ts[a] > max_dt:
                break
            # Already connected by title-key? Skip expensive sim if so.
            if G.has_edge(a, b):
                continue
            sim = float(np.dot(embs[a], embs[b]))  # normalized embeddings
            if sim >= sim_threshold:
                G.add_edge(a, b, reason="sim")

    # Connected components = clusters
    clusters_raw = [sorted(list(cc)) for cc in nx.connected_components(G)]
    # Filter by size
    clusters_raw = [c for c in clusters_raw if len(c) >= min_cluster_size]

    # Build outputs
    clusters_out: List[Dict[str, Any]] = []
    rows: List[Dict[str, Any]] = []
    for cid, idxs in enumerate(sorted(clusters_raw, key=len, reverse=True), start=1):
        sub = [items[i] for i in idxs]
        sources = sorted({s["source"] for s in sub})
        urls = [s["url"] for s in sub if s.get("url")]
        times = sorted([s["published_dt"] for s in sub])
        title = representative_title(idxs, items, embs)

        clusters_out.append({
            "cluster_id": cid,
            "size": len(idxs),
            "representative_title": title,
            "sources": sources,
            "time_start": times[0].isoformat(),
            "time_end": times[-1].isoformat(),
            "members": [{
                "title": it["title"],
                "source": it["source"],
                "published": it["published"],
                "url": it["url"],
                "path": it["path"],
                "filename": it["filename"]
            } for it in sub]
        })

        for it in sub:
            rows.append({
                "cluster_id": cid,
                "title": it["title"],
                "source": it["source"],
                "published": it["published"],
                "url": it["url"],
                "path": it["path"],
                "filename": it["filename"]
            })

    df = pd.DataFrame(rows)
    return clusters_out, df

# ----------- CLI -----------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=str(ROOT), help="Root folder of scraped_articles")
    ap.add_argument("--sim", type=float, default=SIM_THRESHOLD, help="Cosine similarity threshold")
    ap.add_argument("--hours", type=int, default=TIME_WINDOW_HOURS, help="Time window (hours) to allow linking")
    ap.add_argument("--min", type=int, default=MIN_CLUSTER_SIZE, help="Minimum cluster size")
    ap.add_argument("--model", default=MODEL_NAME, help="SentenceTransformer model name")
    ap.add_argument("--outdir", default="cluster_output", help="Where to write outputs")
    args = ap.parse_args()

    root = Path(args.root)
    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    print(f"\nScanning {root} for articles...")
    items = build_corpus(root)
    print(f"Found {len(items)} articles.")

    if not items:
        print("Nothing to do.")
        return

    clusters_out, df = cluster(
        items,
        sim_threshold=args.sim,
        time_window_hours=args.hours,
        min_cluster_size=args.min,
        model_name=args.model
    )

    # Write outputs
    (outdir / "clusters.json").write_text(json.dumps(clusters_out, ensure_ascii=False, indent=2), encoding="utf-8")
    if not df.empty:
        df.to_csv(outdir / "cluster_assignments.csv", index=False, encoding="utf-8")

    # Pretty summary
    lines = ["# Story Clusters\n"]
    for c in clusters_out:
        lines.append(f"## Cluster {c['cluster_id']}  · size {c['size']}")
        lines.append(f"**Representative:** {c['representative_title']}")
        lines.append(f"**Sources:** {', '.join(c['sources'])}")
        lines.append(f"**Window:** {c['time_start']} → {c['time_end']}")
        lines.append("")
        for m in c["members"]:
            lines.append(f"- **{m['source']}** · {m['title']}  ({m['published']})")
        lines.append("\n---\n")
    (outdir / "clusters_summary.md").write_text("\n".join(lines), encoding="utf-8")

    print(f"\nWrote:")
    print(f"  - {outdir / 'clusters.json'}")
    print(f"  - {outdir / 'cluster_assignments.csv'}")
    print(f"  - {outdir / 'clusters_summary.md'}")
    print("Done.")

if __name__ == "__main__":
    main()
