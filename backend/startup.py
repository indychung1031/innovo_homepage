"""Admin staff 계정 seed."""

import logging

from sqlalchemy import select

from backend.config import get_settings
from backend.database import SessionLocal
from backend.models import StaffAccount
from backend.utils.security import hash_password

logger = logging.getLogger(__name__)

# 기본값 그대로면 JWT 위조가 가능한 시크릿들 — 운영 기동 시 점검 대상
_INSECURE_DEFAULTS = {
    "secret_key": "change-me",
    "admin_secret_key": "change-me-admin",
}


def check_production_settings() -> None:
    """운영 환경에서 위험한 기본값·개발용 완화가 남아 있으면 CRITICAL 로그로 경고한다.

    기동 자체는 막지 않는다 — 배포 중 서비스 중단을 피하되, 로그로 즉시 드러나게 한다.
    """
    settings = get_settings()
    if settings.is_development:
        return

    for field, insecure in _INSECURE_DEFAULTS.items():
        if getattr(settings, field) == insecure:
            logger.critical(
                "[보안] %s가 기본값입니다 — .env에 안전한 난수 값을 설정하세요.", field.upper()
            )
    if settings.recaptcha_skip_verify:
        logger.critical("[보안] 운영 환경에서 RECAPTCHA_SKIP_VERIFY=true 입니다.")
    if settings.admin_2fa_dev_bypass:
        logger.critical("[보안] 운영 환경에서 ADMIN_2FA_DEV_BYPASS=true 입니다.")


def seed_staff_if_needed() -> None:
    """ADMIN_SEED_PASSWORD 설정 시 staff 0건이면 1회 생성."""
    settings = get_settings()
    if not settings.admin_seed_password:
        return

    db = SessionLocal()
    try:
        existing = db.scalar(select(StaffAccount).limit(1))
        if existing:
            return

        roles = [r.strip() for r in settings.admin_seed_roles.split(",") if r.strip()]
        staff = StaffAccount(
            email=settings.admin_seed_email,
            password_hash=hash_password(settings.admin_seed_password),
            display_name=settings.admin_seed_display_name,
            roles=roles or ["sales_admin"],
        )
        db.add(staff)
        db.commit()
        logger.info("Admin staff seed 생성: %s", settings.admin_seed_email)
    except Exception:
        logger.exception("Admin staff seed 실패")
        db.rollback()
    finally:
        db.close()
