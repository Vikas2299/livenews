from dotenv import load_dotenv
from pathlib import Path
import os, json
from typing import Dict, List, Any

from crewai import Agent, Crew, Process, LLM
from .cluster_organizer_real import get_view_text_by_cluster, build_view_summary_tasks, build_general_summary_tasks

# Load env (.env next to this file is also loaded)
ENV_PATH = Path(__file__).with_name(".env")
load_dotenv()
load_dotenv(ENV_PATH)

print("Loaded GOOGLE_API_KEY?", bool(os.getenv("GOOGLE_API_KEY")))
_api_key = os.getenv("GOOGLE_API_KEY")

_llm = LLM(
    model="gemini/gemini-3-flash-preview", 
    api_key=_api_key,
    temperature=0.5
)

# Store uppercase keys in JSON
VIEW_TO_OUTPUT_KEY = {
    "LEFT": "LEFT",
    "RIGHT": "RIGHT",
    "CENTER": "CENTER",
    "GENERAL": "GENERAL",
}

VALID_VIEWS = set(VIEW_TO_OUTPUT_KEY.keys())


class CompleteSummarizer:
    """
    Exposes:
      - make_summaries(): builds LEFT/RIGHT/CENTER summaries for every cluster and writes to JSON.
      - get_summaries(): reads from JSON (optionally filtered by cluster title).

    JSON storage format (list of rows):
      {
        "Article title": "<cluster_title>",
        "LEFT":   "<summary or ''>",
        "RIGHT":  "<summary or ''>",
        "CENTER": "<summary or ''>",
        "GENERAL": "<summary or ''>"
      }
    """

    def __init__(self, storage_file = Path(__file__).resolve().parents[2] / "data" / "summaries.json"):
        self.storage_path = Path(storage_file)
        self.llm = _llm


    def _load_existing_rows(self) -> List[Dict[str, Any]]:
        if not self.storage_path.exists():
            return []
        try:
            return json.loads(self.storage_path.read_text(encoding="utf-8"))
        except Exception:
            return []

    
    def _save_rows(self, rows: List[Dict[str, Any]]) -> None:
        payload = json.dumps(rows, ensure_ascii=False, indent=2)
        self.storage_path.write_text(payload, encoding="utf-8")

    
    def _rows_to_index(self, rows: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        """Index by cluster title for upsert."""
        idx: Dict[str, Dict[str, Any]] = {}
        for r in rows:
            title = r.get("Article title")
            if title:
                idx[title] = r
        return idx

    
    def _parse_task_output(self, out: Any) -> Dict[str, Any] | None:
        """
        CrewAI task outputs can be strings or structured objects.
        We try to coerce to the JSON dict we asked the model to emit.
        """
        if out is None:
            return None

        if isinstance(out, dict) and {"cluster_title", "viewpoint", "summary"}.issubset(out.keys()):
            out["viewpoint"] = str(out.get("viewpoint", "")).upper()
            return out

        try:
            s = str(out)
            # Trim to the outermost braces in case there's extra text
            first = s.find("{")
            last = s.rfind("}")
            if first != -1 and last != -1 and last > first:
                s = s[first:last+1]
            j = json.loads(s)
            if isinstance(j, dict):
                j["viewpoint"] = str(j.get("viewpoint", "")).upper()
            return j
        except Exception:
            return None


    def _run_one_view(self,
                      text_views_by_cluster: Dict[str, Dict[str, List[str]]],
                      view: str,
                      task_builder) -> List[Dict[str, Any]]:
        """Run CrewAI tasks for a single viewpoint and return parsed JSON dicts."""
        view = view.upper()
        assert view in VALID_VIEWS, f"Invalid view: {view}"
        agent = Agent(
            role="News Summarizer",
            goal="Summarize sources for each cluster in ~100 words with verifiable facts.",
            backstory="Expert news analyst who distills multiple articles into neutral, structured briefs.",
            allow_delegation=False,
            llm=self.llm,
            verbose=True
        )

        tasks = task_builder(text_views_by_cluster, agent, view)
        if not tasks:
            return []

        crew = Crew(agents=[agent], tasks=tasks, process=Process.sequential)
        _ = crew.kickoff()

        # Collect outputs from each Task
        outputs: List[Any] = []
        for t in tasks:
            if hasattr(t, "output") and t.output:
                outputs.append(t.output)

        parsed: List[Dict[str, Any]] = []
        for o in outputs:
            j = self._parse_task_output(o)
            if j:
                parsed.append(j)
        return parsed


    #API functions
    def make_summaries(self) -> List[Dict[str, Any]]:
        """
        Build LEFT/RIGHT/CENTER summaries for ALL clusters and write to JSON file.
        Returns the list of rows written (each row is one article/cluster).
        """
        try:
            text_views_by_cluster = get_view_text_by_cluster()
        except FileNotFoundError:
            # clusters.json path or content not ready
            self._save_rows([])
            return []
        except Exception as e:
            # surface helpful info while still returning a valid response
            print(f"[make_summaries] get_view_text_by_cluster failed: {e}")
            self._save_rows([])
            return []

        if not text_views_by_cluster:
            self._save_rows([])
            return []

        # Run each viewpoint
        collected: Dict[str, Dict[str, str]] = {}  # {title: {"LEFT": str, "RIGHT": str, "CENTER": str}}
        for v in ("LEFT", "RIGHT", "CENTER"):
            results = self._run_one_view(text_views_by_cluster, v, build_view_summary_tasks)
            key = VIEW_TO_OUTPUT_KEY[v]  # "LEFT"/"RIGHT"/"CENTER"
            for r in results:
                title = r.get("cluster_title")
                summary = (r.get("summary") or "").strip()
                if not title:
                    continue
                if title not in collected:
                    collected[title] = {"LEFT": "More left sources needed",
                                        "RIGHT": "More right sources needed",
                                        "CENTER": "More center sources needed",
                                        "GENERAL": "More general sources needed" }
                collected[title][key] = summary
        
        general_results = self._run_one_view(
        text_views_by_cluster,
        "GENERAL",
        # wrap to match _run_one_view's (tvbc, agent, view) signature
        lambda tvbc, agent, _view: build_general_summary_tasks(tvbc, agent)
        )


        for r in general_results:
            title = r.get("cluster_title")
            summary = (r.get("summary") or "").strip()
            if not title:
                continue
            if title not in collected:
                collected[title] = {"LEFT": "More left sources needed",
                                    "RIGHT": "More right sources needed",
                                    "CENTER": "More center sources needed",
                                    "GENERAL": "More general sources needed" }
            collected[title]["GENERAL"] = summary


        # Upsert into stored rows
        existing_rows = self._load_existing_rows()
        idx = self._rows_to_index(existing_rows)

        for title, tri in collected.items():
            row = idx.get(title) or {"Article title": title, "LEFT": "", "RIGHT": "", "CENTER": "", "GENERAL": ""}
            row["LEFT"]   = tri.get("LEFT", row.get("LEFT", ""))
            row["RIGHT"]  = tri.get("RIGHT", row.get("RIGHT", ""))
            row["CENTER"] = tri.get("CENTER", row.get("CENTER", ""))
            row["GENERAL"] = tri.get("GENERAL", row.get("GENERAL", ""))
            idx[title] = row

        final_rows = list(idx.values())
        final_rows.sort(key=lambda r: r.get("Article title", "").lower())
        self._save_rows(final_rows)
        return final_rows


    #get summaries API function
    def get_summaries(self, cluster_title: str | None = None) -> List[Dict[str, Any]]:
        """
        Read summaries from JSON. If cluster_title is provided, return only that row (if present).
        Output rows have keys: "Article title", "LEFT", "RIGHT", "CENTER", "GENERAL".
        """
        rows = self._load_existing_rows()
        if cluster_title:
            rows = [r for r in rows if r.get("Article title") == cluster_title]
        return rows


    




