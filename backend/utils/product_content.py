"""제품 카탈로그 정적 JSON 로더."""

import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
PRODUCTS_DIR = PROJECT_ROOT / "frontend" / "content" / "products"

CATEGORY_SLUGS = ("test-socket", "probe-pin", "test-jig")

SLUG_TO_FILE = {
    "test-socket": "test_socket.json",
    "probe-pin": "probe_pin.json",
    "test-jig": "test_jig.json",
}


def load_product_catalog(slug: str) -> dict:
    """slug → 패밀리·변형 데이터."""
    filename = SLUG_TO_FILE.get(slug)
    if not filename:
        raise KeyError(slug)
    path = PRODUCTS_DIR / filename
    with path.open(encoding="utf-8") as f:
        return json.load(f)
