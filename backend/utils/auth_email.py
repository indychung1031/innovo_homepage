"""Contact·Auth·Admin 이메일."""

import logging

from backend.config import get_settings
from backend.models import ContactInquiry, User
from backend.utils.email_utils import _send_email

logger = logging.getLogger(__name__)

CATEGORY_LABELS = {
    "test_socket": "Test Socket",
    "probe_pin": "Probe Pin",
    "test_jig": "Test JIG",
    "other": "Other",
}


def send_contact_sales_notification(inquiry: ContactInquiry) -> None:
    settings = get_settings()
    cat = CATEGORY_LABELS.get(inquiry.category, inquiry.category)
    subject = f"[홈페이지 문의] {cat} — {inquiry.company_name} / {inquiry.subject}"
    attach_line = ""
    if inquiry.attachment_name:
        attach_line = f"\n첨부 파일  : {inquiry.attachment_name} (Admin에서 다운로드)\n"
    body = f"""── 문의 ───────────────────────────────
카테고리  : {cat}
제목      : {inquiry.subject}

── 고객 ───────────────────────────────
회사명    : {inquiry.company_name}
담당자    : {inquiry.contact_name}
이메일    : {inquiry.contact_email}
연락처    : {inquiry.contact_phone or '-'}
{attach_line}
── 본문 ───────────────────────────────
{inquiry.message}

Admin: {settings.app_base_url}/admin/contacts
"""
    _send_email(settings.sales_notify_email, subject, body)


def send_contact_customer_confirmation(inquiry: ContactInquiry) -> None:
    if inquiry.lang == "ko":
        subject = "[이노보솔루션] 문의가 접수되었습니다"
        body = f"""안녕하세요, {inquiry.contact_name}님.
문의가 접수되었습니다. 1-2 영업일 내 연락드리겠습니다.

제목: {inquiry.subject}
"""
    else:
        subject = "[Innovo Solution] Your inquiry has been received"
        body = f"""Hello {inquiry.contact_name},

Thank you for contacting Innovo Solution. We will respond within 1-2 business days.

Subject: {inquiry.subject}
"""
    _send_email(inquiry.contact_email, subject, body)


def send_verification_email(user: User, raw_token: str, lang: str) -> None:
    settings = get_settings()
    url = f"{settings.app_base_url}/{lang}/verify-email?token={raw_token}"
    if lang == "ko":
        subject = "[이노보솔루션] 이메일 인증을 완료해 주세요"
        body = f"""안녕하세요, {user.full_name}님.

아래 링크를 클릭해 이메일 인증을 완료해 주세요 (24시간 유효):
{url}
"""
    else:
        subject = "[Innovo Solution] Please verify your email"
        body = f"""Hello {user.full_name},

Click the link below to verify your email (valid 24 hours):
{url}
"""
    _send_email(user.email, subject, body)


def send_password_reset_email(user: User, raw_token: str, lang: str) -> None:
    settings = get_settings()
    url = f"{settings.app_base_url}/{lang}/reset-password?token={raw_token}"
    if lang == "ko":
        subject = "[이노보솔루션] 비밀번호 재설정 안내"
        body = f"""비밀번호 재설정 링크 (1시간 유효):
{url}

본인이 요청하지 않았다면 이 메일을 무시하세요.
"""
    else:
        subject = "[Innovo Solution] Password reset"
        body = f"""Reset your password (valid 1 hour):
{url}

If you did not request this, ignore this email.
"""
    _send_email(user.email, subject, body)


def send_membership_verified_email(user: User, lang: str = "en") -> None:
    if lang == "ko":
        subject = "[이노보솔루션] 인증회원으로 승인되었습니다"
        body = f"""안녕하세요, {user.full_name}님.
인증회원(verified)으로 승인되었습니다. 카탈로그 다운로드 및 기준가 견적 혜택을 이용하실 수 있습니다.
"""
    else:
        subject = "[Innovo Solution] Verified member approved"
        body = f"""Hello {user.full_name},

Your account has been approved as a verified member.
"""
    _send_email(user.email, subject, body)


def send_staff_otp_email(staff_email: str, otp: str) -> None:
    subject = "[Innovo Admin] Login verification code"
    body = f"""Your admin login code (valid 5 minutes):

{otp}
"""
    _send_email(staff_email, subject, body)
