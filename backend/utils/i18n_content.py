"""페이지별 i18n JSON 로더 — frontend/content/i18n/*.json"""

import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
I18N_DIR = PROJECT_ROOT / "frontend" / "content" / "i18n"


def _load_json(path: Path) -> dict:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def load_common_i18n(lang: str) -> dict:
    """헤더·푸터용 common JSON만."""
    common_path = I18N_DIR / f"common.{lang}.json"
    if not common_path.exists():
        common_path = I18N_DIR / "common.en.json"
    return _load_json(common_path)


def load_page_i18n(page: str, lang: str) -> dict:
    """
    common + 페이지 JSON을 병합해 템플릿에 전달.
    page: home | about | products | technology | contact | quote | auth
    """
    common_path = I18N_DIR / f"common.{lang}.json"
    if not common_path.exists():
        common_path = I18N_DIR / "common.en.json"
    data = _load_json(common_path)

    page_path = I18N_DIR / f"{page}.{lang}.json"
    if not page_path.exists():
        page_path = I18N_DIR / f"{page}.en.json"
    if page_path.exists():
        data[page] = _load_json(page_path)
    return data
