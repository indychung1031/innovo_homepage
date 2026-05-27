"""법적 문서 JSON 로더 — frontend/content/legal/*.json"""

import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
LEGAL_DIR = PROJECT_ROOT / "frontend" / "content" / "legal"


def load_legal_document(doc_type: str, lang: str) -> dict:
    """
    doc_type: privacy | terms
    lang: en | ko
    """
    path = LEGAL_DIR / f"{doc_type}.{lang}.json"
    if not path.exists():
        fallback = LEGAL_DIR / f"{doc_type}.en.json"
        path = fallback
    with path.open(encoding="utf-8") as f:
        return json.load(f)
