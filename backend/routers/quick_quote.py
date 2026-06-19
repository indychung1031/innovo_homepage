"""Quick Quote (1차 IC 가견적) API."""

import logging
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.database import get_db
from backend.models import QuickQuoteInquiry
from backend.schemas.quick_quote import QuickQuoteCreate, QuickQuoteResponse
from backend.utils.email_utils import send_customer_confirmation, send_sales_notification
from backend.utils.rate_limit import check_rate_limit
from backend.utils.recaptcha import verify_recaptcha

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["quick-quote"])

SUCCESS_MESSAGES = {
    "ko": "가견적 요청이 접수되었습니다. 영업팀이 1-2 영업일 내 연락드립니다.",
    "en": "Your quick quote request has been received. Our team will contact you within 1-2 business days.",
}


async def _send_to_erp(inquiry: QuickQuoteInquiry) -> int | None:
    """ERP POST /api/external/inquiry 호출 — 실패 시 None 반환 (사용자 응답 차단 안 함)."""
    settings = get_settings()
    if not settings.erp_api_base_url or not settings.erp_api_key:
        return None

    payload: dict = {
        "ic_package_type_code": inquiry.ic_package_type,
        "pin_count": inquiry.pin_count,
        "pitch": inquiry.pitch,
        "package_d": float(inquiry.package_d),
        "package_e": float(inquiry.package_e),
        "company_name": inquiry.company_name,
        "contact_name": inquiry.contact_name,
        "contact_email": inquiry.contact_email,
        "source": "homepage",
    }
    if inquiry.ic_code:
        payload["ic_code"] = inquiry.ic_code
    if inquiry.package_a is not None:
        payload["package_a"] = float(inquiry.package_a)
    if inquiry.contact_phone:
        payload["contact_phone"] = inquiry.contact_phone
    if inquiry.quantity:
        payload["quantity"] = inquiry.quantity
    if inquiry.desired_delivery:
        payload["desired_delivery"] = inquiry.desired_delivery.isoformat()
    if inquiry.message:
        payload["message"] = inquiry.message

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{settings.erp_api_base_url}/api/external/inquiry",
                json=payload,
                headers={"X-API-Key": settings.erp_api_key},
            )
            resp.raise_for_status()
            return resp.json().get("inquiry_id")
    except Exception:
        logger.exception("ERP inquiry 전송 실패 (quick_quote_id=%s)", inquiry.id)
        return None


@router.post(
    "/quick-quote",
    response_model=QuickQuoteResponse,
    status_code=status.HTTP_200_OK,
)
async def create_quick_quote(
    payload: QuickQuoteCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> QuickQuoteResponse:
    """비회원 IC 가견적 접수 — DB 저장 + 이메일 발송 + ERP 전송."""
    check_rate_limit(request)

    client_ip = request.client.host if request.client else None
    if not await verify_recaptcha(payload.recaptcha_token, client_ip):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="reCAPTCHA 검증에 실패했습니다.",
        )

    now = datetime.now(timezone.utc)
    inquiry = QuickQuoteInquiry(
        product_category=payload.product_category,
        ic_type=payload.ic_type,
        ic_package_type=payload.ic_package_type,
        ic_code=payload.ic_code,
        pin_count=payload.pin_count,
        pitch=payload.pitch,
        package_d=payload.package_d,
        package_e=payload.package_e,
        package_a=payload.package_a,
        company_name=payload.company_name,
        contact_name=payload.contact_name,
        contact_email=str(payload.contact_email),
        contact_phone=payload.contact_phone,
        quantity=payload.quantity,
        desired_delivery=payload.desired_delivery,
        message=payload.message,
        status="pending",
        privacy_agreed_at=now,
    )

    db.add(inquiry)
    db.commit()
    db.refresh(inquiry)

    # 이메일 발송 (실패해도 DB 저장 유지)
    try:
        send_sales_notification(inquiry)
        send_customer_confirmation(inquiry, lang=payload.lang)
    except Exception:
        logger.exception("Quick Quote 이메일 발송 실패 (inquiry_id=%s)", inquiry.id)

    # ERP 전송 (실패해도 사용자 응답 차단 안 함)
    erp_inquiry_id = await _send_to_erp(inquiry)
    if erp_inquiry_id:
        inquiry.erp_inquiry_id = erp_inquiry_id
        inquiry.status = "sent_to_erp"
        db.commit()
        logger.info("ERP inquiry 전송 완료 (quick_quote_id=%s, erp_id=%s)", inquiry.id, erp_inquiry_id)

    return QuickQuoteResponse(
        inquiry_id=inquiry.id,
        message=SUCCESS_MESSAGES[payload.lang],
    )
