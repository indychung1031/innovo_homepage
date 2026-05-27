"""JWT 발급·검증 — 고객·Admin 분리."""

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt

from backend.config import get_settings


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(
    subject: str | int,
    extra: dict[str, Any],
    *,
    secret: str,
    expire_minutes: int,
    token_type: str,
) -> str:
    settings = get_settings()
    expire = _utcnow() + timedelta(minutes=expire_minutes)
    payload = {
        "sub": str(subject),
        "exp": expire,
        "type": token_type,
        **extra,
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def create_refresh_token(user_id: int) -> str:
    settings = get_settings()
    expire = _utcnow() + timedelta(days=settings.jwt_refresh_expire_days)
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "type": "refresh",
    }
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def decode_token(token: str, *, secret: str, expected_type: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
    except JWTError as exc:
        raise ValueError("invalid_token") from exc
    if payload.get("type") != expected_type:
        raise ValueError("invalid_token_type")
    return payload


def create_user_access_token(user_id: int, email: str, tier: str) -> str:
    settings = get_settings()
    return create_access_token(
        user_id,
        {"email": email, "tier": tier},
        secret=settings.secret_key,
        expire_minutes=settings.jwt_access_expire_minutes,
        token_type="access",
    )


def create_admin_access_token(staff_id: int, roles: list[str]) -> str:
    settings = get_settings()
    return create_access_token(
        staff_id,
        {"roles": roles},
        secret=settings.admin_secret_key,
        expire_minutes=settings.admin_jwt_expire_minutes,
        token_type="admin",
    )


def create_admin_2fa_challenge(staff_id: int) -> str:
    """2FA 대기 challenge — 5분."""
    settings = get_settings()
    return create_access_token(
        staff_id,
        {},
        secret=settings.admin_secret_key,
        expire_minutes=5,
        token_type="admin_2fa_pending",
    )
