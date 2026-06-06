"""견적 위저드 이메일 발송."""

import logging

from backend.config import get_settings
from backend.models import WizardQuote
from backend.utils.email_utils import _send_email

logger = logging.getLogger(__name__)


def _format_price(amount: int | None, currency: str = "KRW") -> str:
    if amount is None:
        return "담당자 확인 후 안내"
    if currency == "KRW":
        return f"₩{amount:,}"
    return f"{currency} {amount:,}"


def send_wizard_customer_confirmation(quote: WizardQuote) -> None:
    """고객 접수 확인 이메일."""
    settings = get_settings()

    if quote.lang == "ko":
        subject = f"[이노보솔루션] 견적 요청이 접수되었습니다 — {quote.ic_code}"
        price_line = (
            f"가 견적 금액 : {_format_price(quote.total_price, quote.currency or 'KRW')}"
            if quote.matched
            else "가 견적 금액 : 담당자 확인 후 안내"
        )
        attachment_line = (
            f"\n첨부 파일   : {quote.attachment_name}\n※ 첨부 파일은 {settings.sales_notify_email} 로 직접 이메일해 주세요."
            if quote.attachment_name
            else ""
        )
        body = f"""안녕하세요, {quote.contact_name}님.

이노보솔루션에 견적 요청이 접수되었습니다.
담당자가 영업일 기준 1~2일 내 연락드리겠습니다.

── 접수 내용 ───────────────────────────
제품 시리즈 : {quote.series}
소켓 패밀리 : {quote.socket_type_name or '-'}
IC Code     : {quote.ic_code}
패키지 타입 : {quote.ic_package_code}
수량        : {quote.quantity} pcs
{price_line}
납기 예상   : {quote.lead_time_label or '담당자 확인 후 안내'}
견적 유효기간: 요청일로부터 7일{attachment_line}

── 안내 ────────────────────────────────
본 견적은 가 견적이며, 최종 견적은 담당자 확인 후 발행됩니다.
문의: {settings.sales_notify_email}
"""
    else:
        subject = f"[Innovo Solution] Quote Request Received — {quote.ic_code}"
        price_line = (
            f"Est. Price  : {_format_price(quote.total_price, quote.currency or 'KRW')}"
            if quote.matched
            else "Est. Price  : To be confirmed by sales"
        )
        attachment_line = (
            f"\nAttachment  : {quote.attachment_name}\n※ Please email your file directly to {settings.sales_notify_email}."
            if quote.attachment_name
            else ""
        )
        body = f"""Hello {quote.contact_name},

Thank you for submitting a quote request to Innovo Solution.
Our sales team will contact you within 1-2 business days.

── Request Summary ──────────────────────
Series      : {quote.series}
Socket      : {quote.socket_type_name or '-'}
IC Code     : {quote.ic_code}
Package     : {quote.ic_package_code}
Quantity    : {quote.quantity} pcs
{price_line}
Lead Time   : {quote.lead_time_label or 'To be confirmed by sales'}
Valid For   : 7 days from submission{attachment_line}

── Note ─────────────────────────────────
This is a preliminary estimate. The official quote will be issued after review.
Contact: {settings.sales_notify_email}
"""
    _send_email(quote.contact_email, subject, body)


def send_wizard_sales_notification(quote: WizardQuote, app_base_url: str) -> None:
    """영업팀 신규 견적 접수 알림."""
    settings = get_settings()
    subject = f"[새 견적 요청] {quote.contact_company} — {quote.ic_code}"
    price_line = (
        f"가 견적 금액 : {_format_price(quote.total_price, quote.currency or 'KRW')} ({quote.quantity} pcs)"
        if quote.matched
        else "가 견적 금액 : 자동 계산 불가 (담당자 확인 필요)"
    )
    attachment_line = f"\n첨부 파일   : {quote.attachment_name}" if quote.attachment_name else ""
    body = f"""── 고객 정보 ───────────────────────────
회사명      : {quote.contact_company}
담당자      : {quote.contact_name}
이메일      : {quote.contact_email}
연락처      : {quote.contact_phone or '-'}
회원 등급   : {quote.membership_tier}

── 제품 / 견적 ─────────────────────────
시리즈      : {quote.series}
소켓 패밀리 : {quote.socket_type_name or '-'}
IC Code     : {quote.ic_code}
패키지 타입 : {quote.ic_package_code}
치수 D×E×A  : {quote.dimension_d}×{quote.dimension_e}×{quote.dimension_a} mm
핀 수       : {quote.pin_count} pin  / Pitch: {quote.pitch}
수량        : {quote.quantity} pcs
{price_line}
납기        : {quote.lead_time_label or '-'}{attachment_line}

── 특이사항 ─────────────────────────────
{quote.spec_notes or '(없음)'}

── 관리자 페이지 ────────────────────────
{app_base_url}/admin/quotes/{quote.id}
"""
    _send_email(settings.sales_notify_email, subject, body)
