"""Contact 문의 API."""

import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import ContactInquiry
from backend.schemas.contact import ContactCreate, ContactResponse
from backend.utils.auth_email import send_contact_customer_confirmation, send_contact_sales_notification
from backend.utils.contact_files import validate_and_save_attachment
from backend.utils.rate_limit import check_rate_limit
from backend.utils.recaptcha import verify_recaptcha

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["contact"])

SUCCESS_MESSAGES = {
    "ko": "문의가 접수되었습니다. 1-2 영업일 내 연락드리겠습니다.",
    "en": "Your inquiry has been received. We will respond within 1-2 business days.",
}


@router.post("/contact", response_model=ContactResponse)
async def create_contact(
    request: Request,
    data: str = Form(...),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
) -> ContactResponse:
    check_rate_limit(request, limit=5, bucket_suffix="contact")
    if file and file.filename:
        check_rate_limit(request, limit=3, bucket_suffix="contact-upload")

    try:
        payload = ContactCreate.model_validate(json.loads(data))
    except (json.JSONDecodeError, ValidationError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    client_ip = request.client.host if request.client else None
    if not await verify_recaptcha(payload.recaptcha_token, client_ip):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="reCAPTCHA 검증 실패")

    now = datetime.now(timezone.utc)
    inquiry = ContactInquiry(
        category=payload.category,
        company_name=payload.company_name,
        contact_name=payload.contact_name,
        contact_email=str(payload.contact_email),
        contact_phone=payload.contact_phone,
        subject=payload.subject,
        message=payload.message,
        status="new",
        privacy_agreed_at=now,
        lang=payload.lang,
    )
    db.add(inquiry)
    db.flush()

    try:
        path, name, size, mime = validate_and_save_attachment(inquiry.id, file)
        inquiry.attachment_path = path
        inquiry.attachment_name = name
        inquiry.attachment_size = size
        inquiry.attachment_mime = mime
    except HTTPException:
        db.rollback()
        raise

    db.commit()
    db.refresh(inquiry)

    try:
        send_contact_sales_notification(inquiry)
        send_contact_customer_confirmation(inquiry)
    except Exception:
        logger.exception("Contact 이메일 발송 실패 (id=%s)", inquiry.id)

    return ContactResponse(
        inquiry_id=inquiry.id,
        message=SUCCESS_MESSAGES[payload.lang],
    )
