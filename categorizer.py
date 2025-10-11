#!/usr/bin/env python3
"""
categorizer.py
Zero-shot classification for news titles using a pretrained NLI model.

Usage:
    python categorizer.py
"""

from typing import List, Dict, Any
import math  # (import kept in case you extend things later)

try:
    from transformers import pipeline
except ImportError:
    raise SystemExit(
        "Missing dependency: transformers. Install with:\n"
        "  pip install transformers torch --upgrade"
    )

# Labels you want to predict
CATEGORIES = ["general", "tech", "business", "culture", "sports", "politics"]

# Model options:
#   - "facebook/bart-large-mnli" (English baseline)
#   - "MoritzLaurer/mDeBERTa-v3-base-mnli-xnli" (multilingual)
ZSHOT_MODEL = "facebook/bart-large-mnli"

# For multi-label mode, keep labels with score >= threshold
MULTILABEL_THRESHOLD = 0.55

# Used by the NLI model to test each label
HYPOTHESIS_TEMPLATE = "This text is about {}."


class TitleClassifier:
    """Wraps a zero-shot classification pipeline for single or multi-label use."""

    def __init__(
        self,
        labels: List[str],
        model_name: str = ZSHOT_MODEL,
        hypothesis_template: str = HYPOTHESIS_TEMPLATE,
    ):
        self.labels = labels
        self.zero_shot = pipeline(
            "zero-shot-classification",
            model=model_name,
            device_map="auto"  # uses GPU if available
        )
        self.hypothesis_template = hypothesis_template

    def classify_single(self, title: str) -> Dict[str, Any]:
        """Single-label: return best label and score."""
        res = self.zero_shot(
            sequences=title,
            candidate_labels=self.labels,
            hypothesis_template=self.hypothesis_template,
            multi_label=False,
        )
        return {
            "title": title,
            "label": res["labels"][0],
            "score": float(res["scores"][0]),
            "all_labels": res["labels"],
            "all_scores": [float(s) for s in res["scores"]],
        }

    def classify_multi(self, title: str, threshold: float = MULTILABEL_THRESHOLD) -> Dict[str, Any]:
        """Multi-label: return all labels with score >= threshold (fallback to top-1)."""
        res = self.zero_shot(
            sequences=title,
            candidate_labels=self.labels,
            hypothesis_template=self.hypothesis_template,
            multi_label=True,
        )
        labels = res["labels"]
        scores = [float(s) for s in res["scores"]]
        picked = [(lab, sc) for lab, sc in zip(labels, scores) if sc >= threshold] or [(labels[0], scores[0])]
        return {
            "title": title,
            "labels": [l for l, _ in picked],
            "scores": [s for _, s in picked],
            "all_labels": labels,
            "all_scores": scores,
            "threshold": threshold,
        }

    def batch_classify_single(self, titles: List[str]) -> List[Dict[str, Any]]:
        return [self.classify_single(t) for t in titles]

    def batch_classify_multi(self, titles: List[str], threshold: float = MULTILABEL_THRESHOLD) -> List[Dict[str, Any]]:
        return [self.classify_multi(t, threshold=threshold) for t in titles]


def normalize_title(t: str) -> str:
    """Trim and collapse whitespace; keeps meaning intact."""
    return " ".join(t.strip().split())


def demo():
    titles = [
        "Federal Reserve raises interest rates again",
        "Apple unveils new iPhone and MacBook lineup",
        "Manchester City clinches Premier League title",
        "Oscars 2025: Biggest surprises and winners of the night",
        "Scientists detect water under Martian surface",
        "Stock market hits record highs after tech rally",
        "NBA playoffs: Lakers defeat Warriors in Game 7",
        "Supreme Court hears landmark free speech case",
        "Striking actors reach tentative deal with studios",
        "Senate advances bipartisan bill on AI regulation",
    ]

    titles = [normalize_title(t) for t in titles]
    clf = TitleClassifier(labels=CATEGORIES, model_name=ZSHOT_MODEL)

    print("=" * 80)
    print("SINGLE-LABEL (best category):")
    print("=" * 80)
    for r in clf.batch_classify_single(titles):
        print(f"[{r['label']:<9} | {r['score']:.2f}]  {r['title']}")

    print("\n" + "=" * 80)
    print("MULTI-LABEL (labels >= threshold):")
    print("=" * 80)
    for r in clf.batch_classify_multi(titles, threshold=MULTILABEL_THRESHOLD):
        lab_str = ", ".join(f"{l}({s:.2f})" for l, s in zip(r["labels"], r["scores"]))
        print(f"[{lab_str}]  {r['title']}")


# Notes for tuning / prod (short version):
# - Start threshold around 0.55–0.65 for multi-label. Adjust on a small labeled set.
# - For multilingual input, switch ZSHOT_MODEL to the mDeBERTa XNLI checkpoint.
# - Cache by title (e.g., Redis) and add simple rules (team names -> sports) to save calls.

if __name__ == "__main__":
    demo()
