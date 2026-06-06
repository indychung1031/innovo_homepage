"""견적 위저드 제출 라우터."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.database import get_db
from backend.deps import get_current_user
from backend.models import User, WizardQuote
from backend.utils.wizard_email import send_wizard_customer_confirmation, send_wizard_sales_notification

logger = logging.getLogger(__name__)

router = APIRouter(tags=["quote"])


class EstimateResult(BaseModel):
    matched: bool
    unit_price: int
    currency: str
    quantity: int
    total_price: int
    lead_time_label: str | None = None


class WizardSubmitPayload(BaseModel):
    lang: str = "en"
    series: str
    ic_type: str
    ic_code: str
    ic_package_code: str
    dimension_d: float
    dimension_e: float
    dimension_a: float
    pitch: str
    pin_count: int
    socket_type_id: int | None = None
    socket_type_name: str = ""
    quantity: int
    cover_type_id: int | None = None
    material_type_id: int | None = None
    spec_notes: str = ""
    attachment_name: str = ""
    estimate: EstimateResult
    contact_name: str
    contact_company: str
    contact_email: str
    contact_phone: str = ""


class WizardSubmitResponse(BaseModel):
    message: str


@router.post("/api/quote/wizard", response_model=WizardSubmitResponse)
def submit_wizard_quote(
    payload: WizardSubmitPayload,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> WizardSubmitResponse:
    if not current_user.email_verified_at:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이메일 인증이 필요합니다.",
        )

    quote = WizardQuote(
        user_id=current_user.id,
        status="pending",
        lang=payload.lang[:2],
        series=payload.series,
        ic_type=payload.ic_type.strip(),
        ic_code=payload.ic_code.strip(),
        ic_package_code=payload.ic_package_code,
        dimension_d=payload.dimension_d,
        dimension_e=payload.dimension_e,
        dimension_a=payload.dimension_a,
        pitch=payload.pitch.strip(),
        pin_count=payload.pin_count,
        socket_type_id=payload.socket_type_id,
        socket_type_name=payload.socket_type_name or None,
        quantity=payload.quantity,
        cover_type_id=payload.cover_type_id,
        material_type_id=payload.material_type_id,
        spec_notes=payload.spec_notes.strip() or None,
        attachment_name=payload.attachment_name.strip() or None,
        matched=payload.estimate.matched,
        unit_price=payload.estimate.unit_price if payload.estimate.matched else None,
        currency=payload.estimate.currency,
        total_price=payload.estimate.total_price if payload.estimate.matched else None,
        lead_time_label=payload.estimate.lead_time_label,
        contact_name=payload.contact_name.strip(),
        contact_company=payload.contact_company.strip(),
        contact_email=payload.contact_email.strip(),
        contact_phone=payload.contact_phone.strip() or None,
        membership_tier=current_user.membership_tier,
    )
    db.add(quote)
    db.commit()
    db.refresh(quote)

    settings = get_settings()

    try:
        send_wizard_customer_confirmation(quote)
    except Exception:
        logger.exception("고객 접수 확인 메일 발송 실패 (quote_id=%s)", quote.id)

    try:
        send_wizard_sales_notification(quote, settings.app_base_url)
    except Exception:
        logger.exception("영업팀 알림 메일 발송 실패 (quote_id=%s)", quote.id)

    return WizardSubmitResponse(message="Quote request received.")


@router.get("/api/quote/history")
def get_quote_history(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> list:
    quotes = (
        db.query(WizardQuote)
        .filter(WizardQuote.user_id == current_user.id)
        .order_by(WizardQuote.created_at.desc())
        .all()
    )
    return [
        {
            "id": q.id,
            "series": q.series,
            "ic_code": q.ic_code,
            "socket_type_name": q.socket_type_name,
            "quantity": q.quantity,
            "matched": q.matched,
            "total_price": q.total_price,
            "currency": q.currency,
            "status": q.status,
            "created_at": q.created_at.isoformat(),
        }
        for q in quotes
    ]
