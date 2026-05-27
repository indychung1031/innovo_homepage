"""Quick Quote (1차 IC 가견적) API."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

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
    """비회원 IC 가견적 접수 — DB 저장 후 영업팀·고객 이메일 발송."""
    check_rate_limit(request)

    client_ip = request.client.host if request.client else None
    if not await verify_recaptcha(payload.recaptcha_token, client_ip):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="reCAPTCHA 검증에 실패했습니다.",
        )

    now = datetime.now(timezone.utc)
    inquiry = QuickQuoteInquiry(
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

    try:
        send_sales_notification(inquiry)
        send_customer_confirmation(inquiry, lang=payload.lang)
    except Exception:
        # DB 저장은 유지 — 메일 실패는 로그만 남김
        logger.exception("Quick Quote 이메일 발송 실패 (inquiry_id=%s)", inquiry.id)

    return QuickQuoteResponse(
        inquiry_id=inquiry.id,
        message=SUCCESS_MESSAGES[payload.lang],
    )
