"""Admin staff 계정 seed."""

import logging

from sqlalchemy import select

from backend.config import get_settings
from backend.database import SessionLocal
from backend.models import StaffAccount
from backend.utils.security import hash_password

logger = logging.getLogger(__name__)


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
