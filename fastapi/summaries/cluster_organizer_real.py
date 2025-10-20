import json
from pathlib import Path
from typing import Dict, List
from crewai import Task

# Viewpoint source lists
CENTER_LIST = ["BBC", "NPR", "PBS"]
RIGHT_LIST  = ["Fox_News", "Breitbart"]
LEFT_LIST   = ["The Guardian", "CNN", "Washington_Post"]

VIEW_ORDER = ["LEFT", "RIGHT", "CENTER"]
VIEW_TO_SOURCES = {
    "LEFT": LEFT_LIST,
    "RIGHT": RIGHT_LIST,
    "CENTER": CENTER_LIST,
}

# Load clusters.json relative to this file
THIS_DIR = Path(__file__).parent
CLUSTERS_PATH = (THIS_DIR / "../cluster_output/clusters.json").resolve()

with open(CLUSTERS_PATH, "r", encoding="utf-8") as f:
    _clusters = json.load(f)  # list of { representative_title, members: [{source, path}, ...] }


def _read_article_texts(file_paths: List[str]) -> List[str]:
    """Open each path and return the cleaned article text."""
    out: List[str] = []
    for fp in file_paths:
        p = Path(fp)
        if not p.exists():
            continue
        raw = p.read_text(encoding="utf-8", errors="ignore")
        parts = raw.split("================================================================================")
        text = parts[1].strip() if len(parts) > 1 else raw.strip()
        if text:
            out.append(text)
    return out


def _files_by_cluster_for_sources(sources: List[str]) -> Dict[str, List[str]]:
    """{cluster_title: [file_path, ...]} filtered by allowed sources."""
    by_cluster: Dict[str, List[str]] = {}
    for cluster in _clusters:
        title = cluster["representative_title"]
        members = cluster.get("members", [])
        paths = [m["path"] for m in members if m.get("source") in sources]
        by_cluster[title] = paths
    return by_cluster


def get_view_text_by_cluster() -> Dict[str, Dict[str, List[str]]]:
    """
    Returns a uniform structure per cluster:
    {
      "<cluster_title>": {
        "LEFT":   [text, ...],
        "RIGHT":  [text, ...],
        "CENTER": [text, ...]
      },
      ...
    }
    """

    per_view_files = {
        view: _files_by_cluster_for_sources(VIEW_TO_SOURCES[view])
        for view in VIEW_ORDER
    }

    # union of all titles present in any view
    all_titles = set()
    for v in VIEW_ORDER:
        all_titles.update(per_view_files[v].keys())

    result: Dict[str, Dict[str, List[str]]] = {}
    for title in all_titles:
        result[title] = {}
        for v in VIEW_ORDER:
            files = per_view_files[v].get(title, [])
            result[title][v] = _read_article_texts(files)
    return result


def join_articles(texts: List[str]) -> str:
    return "\n\n--- ARTICLE SEPARATOR ---\n\n".join(
        t.strip() for t in texts if t and t.strip()
    )



def make_summary_agent_prompt(cluster_title: str, view_texts: List[str], view: str) -> str:
    body = join_articles(view_texts)
    return f"""You are summarizing articles for the news cluster:
"{cluster_title}"

GOAL:
- Produce a 100 words concise summary.
- Include 3-5 concrete, verifiable facts (short, quotable snippets).
- Be neutral and avoid speculation.
- If multiple articles repeat the same fact, collapse duplicates.

INPUT (all articles, separated by a delimiter):
{body}

Return ONLY JSON:
{{
  "cluster_title": "{cluster_title}",
  "viewpoint": "{view}",
  "summary": "...",
  "key_facts": [{{"claim": "...", "short_quote": "..."}}]
}}
"""


def build_view_summary_tasks(text_views_by_cluster: Dict[str, Dict[str, List[str]]],
                             agent,
                             view: str) -> List[Task]:
    """One Task per cluster for the chosen view."""
    tasks: List[Task] = []
    for cluster_title, per_view in text_views_by_cluster.items():
        view_texts = per_view.get(view, [])
        if not view_texts:
            continue  # skip clusters with no articles for this viewpoint
        prompt = make_summary_agent_prompt(cluster_title, view_texts, view)
        tasks.append(Task(
            description=prompt,
            expected_output='JSON with fields: cluster_title, viewpoint, summary, key_facts[].',
            agent=agent
        ))
    return tasks