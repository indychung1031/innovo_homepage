"""reCAPTCHA v3 토큰 검증."""

import logging

import httpx

from backend.config import get_settings

logger = logging.getLogger(__name__)

RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"
MIN_SCORE = 0.5


async def verify_recaptcha(token: str, remote_ip: str | None = None) -> bool:
    """
    Google reCAPTCHA v3 검증.
    RECAPTCHA_SKIP_VERIFY=true 이면 개발 환경에서 검증 생략.
    """
    settings = get_settings()

    if settings.recaptcha_skip_verify:
        logger.warning("reCAPTCHA 검증 생략 (RECAPTCHA_SKIP_VERIFY=true)")
        return True

    if not settings.recaptcha_secret_key:
        logger.error("RECAPTCHA_SECRET_KEY 미설정 — 검증 불가")
        return False

    payload: dict[str, str] = {
        "secret": settings.recaptcha_secret_key,
        "response": token,
    }
    if remote_ip:
        payload["remoteip"] = remote_ip

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(RECAPTCHA_VERIFY_URL, data=payload)
            response.raise_for_status()
            result = response.json()
    except httpx.HTTPError as exc:
        logger.exception("reCAPTCHA API 호출 실패: %s", exc)
        return False

    if not result.get("success"):
        logger.warning("reCAPTCHA 검증 실패: %s", result.get("error-codes"))
        return False

    score = result.get("score", 0)
    if score < MIN_SCORE:
        logger.warning("reCAPTCHA score 낮음: %s", score)
        return False

    return True
