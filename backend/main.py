"""Innovo_homepage FastAPI 애플리케이션 진입점."""

import logging
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from backend.routers import account, admin, auth, contact, quick_quote
from backend.startup import seed_staff_if_needed

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
UPLOAD_DIR = PROJECT_ROOT / "upload"

app = FastAPI(
    title="Innovo Solution Homepage",
    description="Innovosolution B2B 공식 홈페이지 API",
    version="0.2.0",
)

app.include_router(quick_quote.router)
app.include_router(contact.router)
app.include_router(auth.router)
app.include_router(account.router)
app.include_router(admin.router)


@app.on_event("startup")
def on_startup() -> None:
    seed_staff_if_needed()


if UPLOAD_DIR.exists():
    app.mount("/upload", StaticFiles(directory=str(UPLOAD_DIR)), name="upload")


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
