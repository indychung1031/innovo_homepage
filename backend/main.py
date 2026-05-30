"""Innovo_homepage FastAPI 애플리케이션 진입점."""

import logging
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from backend.config import get_settings
from backend.routers import admin, auth, contact, quick_quote
from backend.startup import seed_staff_if_needed
from backend.utils.i18n_content import load_common_i18n, load_page_i18n
from backend.utils.legal_content import load_legal_document
from backend.utils.product_content import CATEGORY_SLUGS, load_product_catalog

LangCode = Literal["en", "ko"]
CategorySlug = Literal["test-socket", "probe-pin", "test-jig"]

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"
UPLOAD_DIR = PROJECT_ROOT / "upload"

app = FastAPI(
    title="Innovo Solution Homepage",
    description="Innovosolution B2B 공식 홈페이지 API",
    version="0.2.0",
)

templates = Jinja2Templates(directory=str(FRONTEND_DIR / "templates"))


def _page_context(request: Request, lang: LangCode, page: str | None = None, **extra: object) -> dict:
    """공통 템플릿 컨텍스트 — i18n·언어 토글."""
    path = request.url.path
    prefix = f"/{lang}"
    path_without_lang = path[len(prefix) :] if path.startswith(prefix) else path
    if not path_without_lang:
        path_without_lang = "/"

    if page:
        t = load_page_i18n(page, lang)
    else:
        t = load_common_i18n(lang)

    return {
        "request": request,
        "lang": lang,
        "path_without_lang": path_without_lang,
        "t": t,
        **extra,
    }


app.include_router(quick_quote.router)
app.include_router(contact.router)
app.include_router(auth.router)
app.include_router(admin.router)


@app.on_event("startup")
def on_startup() -> None:
    seed_staff_if_needed()

if (FRONTEND_DIR / "css").exists():
    app.mount("/static/css", StaticFiles(directory=str(FRONTEND_DIR / "css")), name="css")
if (FRONTEND_DIR / "js").exists():
    app.mount("/static/js", StaticFiles(directory=str(FRONTEND_DIR / "js")), name="js")
if UPLOAD_DIR.exists():
    app.mount("/upload", StaticFiles(directory=str(UPLOAD_DIR)), name="upload")


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
def root_redirect() -> RedirectResponse:
    return RedirectResponse(url="/en/", status_code=302)


@app.get("/{lang}/")
def home_page(request: Request, lang: LangCode):
    return templates.TemplateResponse(
        request=request,
        name="pages/home.html",
        context=_page_context(request, lang, page="home"),
    )


@app.get("/{lang}/about")
def about_page(request: Request, lang: LangCode):
    return templates.TemplateResponse(
        request=request,
        name="pages/about.html",
        context=_page_context(request, lang, page="about"),
    )


@app.get("/{lang}/products")
def products_index(request: Request, lang: LangCode):
    categories = [load_product_catalog(slug) for slug in CATEGORY_SLUGS]
    return templates.TemplateResponse(
        request=request,
        name="pages/products/index.html",
        context=_page_context(request, lang, page="products", categories=categories),
    )


@app.get("/{lang}/products/probe-pin/general")
def probe_pin_general(request: Request, lang: LangCode):
    return templates.TemplateResponse(
        request=request,
        name="pages/products/probe_pin_general.html",
        context=_page_context(request, lang, page="products"),
    )


@app.get("/{lang}/products/probe-pin/special")
def probe_pin_special(request: Request, lang: LangCode):
    return templates.TemplateResponse(
        request=request,
        name="pages/products/probe_pin_special.html",
        context=_page_context(request, lang, page="products"),
    )


@app.get("/{lang}/products/probe-pin/custom")
def probe_pin_custom(request: Request, lang: LangCode):
    return templates.TemplateResponse(
        request=request,
        name="pages/products/probe_pin_custom.html",
        context=_page_context(request, lang, page="products"),
    )


@app.get("/{lang}/products/{category_slug}")
def products_category(request: Request, lang: LangCode, category_slug: CategorySlug):
    try:
        catalog = load_product_catalog(category_slug)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Category not found") from exc
    return templates.TemplateResponse(
        request=request,
        name="pages/products/category.html",
        context=_page_context(request, lang, page="products", catalog=catalog, category_slug=category_slug),
    )


@app.get("/{lang}/technology")
def technology_page(request: Request, lang: LangCode):
    return templates.TemplateResponse(
        request=request,
        name="pages/technology.html",
        context=_page_context(request, lang, page="technology"),
    )


@app.get("/{lang}/contact")
def contact_page(request: Request, lang: LangCode):
    settings = get_settings()
    return templates.TemplateResponse(
        request=request,
        name="pages/contact.html",
        context=_page_context(
            request, lang, page="contact", recaptcha_site_key=settings.recaptcha_site_key
        ),
    )


@app.get("/{lang}/quote")
def quote_page(request: Request, lang: LangCode):
    settings = get_settings()
    return templates.TemplateResponse(
        request=request,
        name="quote/quick_quote_form.html",
        context=_page_context(
            request,
            lang,
            page="quote",
            recaptcha_site_key=settings.recaptcha_site_key,
        ),
    )


@app.get("/{lang}/privacy")
def privacy_page(request: Request, lang: LangCode):
    doc = load_legal_document("privacy", lang)
    return templates.TemplateResponse(
        request=request,
        name="legal/document.html",
        context=_page_context(request, lang, doc=doc),
    )


@app.get("/{lang}/terms")
def terms_page(request: Request, lang: LangCode):
    doc = load_legal_document("terms", lang)
    return templates.TemplateResponse(
        request=request,
        name="legal/document.html",
        context=_page_context(request, lang, doc=doc),
    )


@app.get("/{lang}/login")
def login_page(request: Request, lang: LangCode):
    return templates.TemplateResponse(
        request=request,
        name="auth/login.html",
        context=_page_context(request, lang),
    )


@app.get("/{lang}/register")
def register_page(request: Request, lang: LangCode):
    settings = get_settings()
    return templates.TemplateResponse(
        request=request,
        name="auth/register.html",
        context=_page_context(request, lang, recaptcha_site_key=settings.recaptcha_site_key),
    )


@app.get("/{lang}/forgot-password")
def forgot_password_page(request: Request, lang: LangCode):
    return templates.TemplateResponse(
        request=request,
        name="auth/forgot_password.html",
        context=_page_context(request, lang),
    )


@app.get("/{lang}/reset-password")
def reset_password_page(request: Request, lang: LangCode):
    return templates.TemplateResponse(
        request=request,
        name="auth/reset_password.html",
        context=_page_context(request, lang),
    )


@app.get("/{lang}/verify-email")
def verify_email_page(request: Request, lang: LangCode):
    return templates.TemplateResponse(
        request=request,
        name="auth/verify_email.html",
        context=_page_context(request, lang),
    )


@app.get("/admin")
def admin_login_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="admin/login.html",
        context={"request": request},
    )


@app.get("/admin/quotes")
def admin_quotes_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="admin/quotes.html",
        context={"request": request, "active": "quotes"},
    )


@app.get("/admin/quotes/detail")
def admin_quote_detail_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="admin/quote_detail.html",
        context={"request": request},
    )


@app.get("/admin/contacts")
def admin_contacts_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="admin/contacts.html",
        context={"request": request, "active": "contacts"},
    )


@app.get("/admin/contacts/detail")
def admin_contact_detail_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="admin/contact_detail.html",
        context={"request": request},
    )


@app.get("/admin/users")
def admin_users_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="admin/users.html",
        context={"request": request, "active": "users"},
    )
