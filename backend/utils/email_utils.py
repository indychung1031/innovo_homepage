"""Mailnara SMTP 이메일 발송."""

import logging
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from backend.config import get_settings
from backend.models import QuickQuoteInquiry

logger = logging.getLogger(__name__)


def _send_email(to_addr: str, subject: str, body: str) -> None:
    """SMTP SSL로 단일 텍스트 메일 발송."""
    settings = get_settings()

    if not settings.smtp_user or not settings.smtp_password:
        logger.warning(
            "SMTP 자격증명 미설정 — 메일 발송 생략 (to=%s, subject=%s)",
            to_addr,
            subject,
        )
        return

    message = MIMEMultipart()
    message["From"] = settings.smtp_from_email
    message["To"] = to_addr
    message["Subject"] = subject
    message.attach(MIMEText(body, "plain", "utf-8"))

    context = ssl.create_default_context()
    with smtplib.SMTP_SSL(
        settings.smtp_host, settings.smtp_port, context=context, timeout=5
    ) as server:
        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_from_email, [to_addr], message.as_string())


def _format_ic_specs(inquiry: QuickQuoteInquiry) -> str:
    """이메일 본문용 IC 규격 블록."""
    lines = [
        f"패키지 타입 : {inquiry.ic_package_type}",
        f"IC Code     : {inquiry.ic_code or '-'}",
        f"핀 수       : {inquiry.pin_count} pin",
        f"피치        : {inquiry.pitch}",
    ]
    if inquiry.ic_type:
        lines.insert(1, f"IC Type     : {inquiry.ic_type}")
    height = (
        f" / A(높이)={inquiry.package_a}mm"
        if inquiry.package_a is not None
        else ""
    )
    lines.append(
        f"크기        : D={inquiry.package_d}mm / E={inquiry.package_e}mm{height}"
    )
    return "\n".join(lines)


def _format_extra_info(inquiry: QuickQuoteInquiry) -> str:
    """선택 필드 블록."""
    lines = []
    if inquiry.quantity:
        lines.append(f"수량        : {inquiry.quantity} pcs")
    if inquiry.desired_delivery:
        lines.append(f"납기 희망   : {inquiry.desired_delivery}")
    if inquiry.message:
        lines.append(f"기타 요청   : {inquiry.message}")
    return "\n".join(lines) if lines else "(없음)"


def send_sales_notification(inquiry: QuickQuoteInquiry) -> None:
    """영업팀 접수 알림."""
    settings = get_settings()
    subject = (
        f"[홈페이지 가견적 접수] {inquiry.ic_package_type} / "
        f"{inquiry.pin_count}핀 / {inquiry.package_d}×{inquiry.package_e}mm "
        f"— {inquiry.company_name}"
    )
    erp_url = settings.erp_api_base_url or "(ERP URL 미설정)"
    body = f"""── IC 규격 ─────────────────────────────
{_format_ic_specs(inquiry)}

── 고객 정보 ───────────────────────────
회사명      : {inquiry.company_name}
담당자      : {inquiry.contact_name}
이메일      : {inquiry.contact_email}
연락처      : {inquiry.contact_phone or '-'}

── 추가 정보 ───────────────────────────
{_format_extra_info(inquiry)}

── 처리 안내 ───────────────────────────
ERP 대시보드 [홈페이지 접수] 탭에서 확인 후 견적서를 작성해 주세요.
ERP URL: {erp_url}
"""
    _send_email(settings.sales_notify_email, subject, body)


def send_customer_confirmation(inquiry: QuickQuoteInquiry, lang: str = "en") -> None:
    """고객 접수 확인 메일."""
    height_part = ""
    if inquiry.package_a is not None:
        height_part = f" × A={inquiry.package_a}mm"

    if lang == "ko":
        subject = "[이노보솔루션] 가견적 요청이 접수되었습니다"
        body = f"""안녕하세요, {inquiry.contact_name}님.
이노보솔루션에 가견적 요청이 접수되었습니다.
담당자가 1-2 영업일 내 연락드리겠습니다.

접수 내용:
  IC 패키지 : {inquiry.ic_package_type} / {inquiry.pin_count}핀 / {inquiry.pitch} pitch
  IC Code   : {inquiry.ic_code or '-'}
  IC 크기   : D={inquiry.package_d}mm × E={inquiry.package_e}mm{height_part}

문의: {get_settings().sales_notify_email}
"""
    else:
        subject = "[Innovo Solution] Your quick quote request has been received"
        body = f"""Hello {inquiry.contact_name},

Thank you for submitting a quick quote request to Innovo Solution.
Our sales team will contact you within 1-2 business days.

Summary:
  IC Package : {inquiry.ic_package_type} / {inquiry.pin_count} pins / {inquiry.pitch} pitch
  IC Code    : {inquiry.ic_code or '-'}
  IC Size    : D={inquiry.package_d}mm × E={inquiry.package_e}mm{height_part}

Contact: {get_settings().sales_notify_email}
"""
    _send_email(inquiry.contact_email, subject, body)
