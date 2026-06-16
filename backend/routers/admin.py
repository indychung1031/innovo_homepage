"""Admin API — 로그인·2FA·목록."""

import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pyotp
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import FileResponse
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.database import get_db
from backend.deps import get_current_staff, require_staff_roles
from backend.models import ContactInquiry, QuickQuoteInquiry, StaffAccount, StaffLoginOtp, User, WizardQuote
from backend.schemas.admin import (
    AdminLoginChallengeResponse,
    AdminLoginRequest,
    AdminLoginSuccessResponse,
    AdminVerify2FARequest,
    DashboardResponse,
    MembershipPatch,
    StatusPatch,
    WizardStatusPatch,
)
from backend.utils.auth_email import send_membership_verified_email, send_staff_otp_email
from backend.utils.jwt_utils import create_admin_2fa_challenge, create_admin_access_token, decode_token
from backend.utils.rate_limit import check_rate_limit
from backend.utils.security import generate_otp_code, hash_token, verify_password

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/api", tags=["admin"])
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


@router.post("/login", response_model=AdminLoginChallengeResponse)
async def admin_login(
    payload: AdminLoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> AdminLoginChallengeResponse:
    check_rate_limit(request, limit=5, bucket_suffix="admin-login")
    staff = db.scalar(select(StaffAccount).where(StaffAccount.email == str(payload.email)))
    if not staff or not staff.is_active or not verify_password(payload.password, staff.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    otp = generate_otp_code()
    now = datetime.now(timezone.utc)
    db.add(
        StaffLoginOtp(
            staff_id=staff.id,
            otp_hash=hash_token(otp),
            expires_at=now + timedelta(minutes=5),
        )
    )
    db.commit()

    try:
        send_staff_otp_email(staff.email, otp)
    except Exception:
        logger.exception("Admin OTP 메일 실패 staff_id=%s", staff.id)
        # 개발 환경에서는 터미널에 OTP 출력 (SMTP 차단 환경 대응)
        settings = get_settings()
        if settings.is_development:
            logger.warning("🔑 [DEV] Admin OTP for %s: %s", staff.email, otp)

    return AdminLoginChallengeResponse(
        challenge_token=create_admin_2fa_challenge(staff.id),
        message="Verification code sent to your email.",
    )


@router.post("/verify-2fa", response_model=AdminLoginSuccessResponse)
async def admin_verify_2fa(
    payload: AdminVerify2FARequest,
    request: Request,
    db: Session = Depends(get_db),
) -> AdminLoginSuccessResponse:
    check_rate_limit(request, limit=10, bucket_suffix="admin-2fa")
    settings = get_settings()
    try:
        challenge = decode_token(
            payload.challenge_token,
            secret=settings.admin_secret_key,
            expected_type="admin_2fa_pending",
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid challenge token") from None

    staff = db.get(StaffAccount, int(challenge["sub"]))
    if not staff or not staff.is_active:
        raise HTTPException(status_code=401, detail="Staff not found")

    now = datetime.now(timezone.utc)
    otp_valid = False

    # 개발 환경 전용 — 고정 bypass 코드 허용
    settings_check = get_settings()
    if settings_check.is_development and payload.otp_code == "000000":
        otp_valid = True

    if not otp_valid and staff.totp_secret:
        totp = pyotp.TOTP(staff.totp_secret)
        if totp.verify(payload.otp_code, valid_window=1):
            otp_valid = True

    if not otp_valid:
        otp_hash = hash_token(payload.otp_code)
        row = db.scalar(
            select(StaffLoginOtp)
            .where(
                StaffLoginOtp.staff_id == staff.id,
                StaffLoginOtp.otp_hash == otp_hash,
                StaffLoginOtp.used_at.is_(None),
                StaffLoginOtp.expires_at >= now,
            )
            .order_by(StaffLoginOtp.created_at.desc())
        )
        if row:
            row.used_at = now
            otp_valid = True

    if not otp_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    staff.last_login_at = now
    db.commit()

    token = create_admin_access_token(staff.id, staff.roles or [])
    return AdminLoginSuccessResponse(
        access_token=token,
        expires_in=settings.admin_jwt_expire_minutes * 60,
        staff={
            "id": staff.id,
            "email": staff.email,
            "display_name": staff.display_name,
            "roles": staff.roles,
        },
    )


@router.get("/me")
def admin_me(staff: StaffAccount = Depends(get_current_staff)):
    return {
        "id": staff.id,
        "email": staff.email,
        "display_name": staff.display_name,
        "roles": staff.roles,
    }


def _paginate_query(model, db, page, size, status_filter, q, status_col, search_cols):
    query = select(model).order_by(model.created_at.desc())
    count_q = select(func.count()).select_from(model)

    if status_filter:
        query = query.where(status_col == status_filter)
        count_q = count_q.where(status_col == status_filter)
    if q:
        like = f"%{q}%"
        cond = or_(*[col.ilike(like) for col in search_cols])
        query = query.where(cond)
        count_q = count_q.where(cond)

    total = db.scalar(count_q) or 0
    rows = db.scalars(query.offset((page - 1) * size).limit(size)).all()
    return total, rows


@router.get("/quick-quotes")
def list_quick_quotes(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    q: str | None = None,
    db: Session = Depends(get_db),
    _staff: StaffAccount = Depends(require_staff_roles("admin", "sales_admin")),
):
    total, rows = _paginate_query(
        QuickQuoteInquiry,
        db,
        page,
        size,
        status_filter,
        q,
        QuickQuoteInquiry.status,
        [QuickQuoteInquiry.company_name, QuickQuoteInquiry.contact_email],
    )
    return {
        "total": total,
        "page": page,
        "items": [
            {
                "id": r.id,
                "company_name": r.company_name,
                "contact_name": r.contact_name,
                "contact_email": r.contact_email,
                "ic_code": r.ic_code,
                "ic_package_type": r.ic_package_type,
                "pin_count": r.pin_count,
                "pitch": r.pitch,
                "status": r.status,
                "erp_inquiry_id": r.erp_inquiry_id,
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ],
    }


@router.get("/quick-quotes/{item_id}")
def get_quick_quote(
    item_id: int,
    db: Session = Depends(get_db),
    _staff: StaffAccount = Depends(require_staff_roles("admin", "sales_admin")),
):
    r = db.get(QuickQuoteInquiry, item_id)
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    return {
        "id": r.id,
        "ic_type": r.ic_type,
        "ic_package_type": r.ic_package_type,
        "ic_code": r.ic_code,
        "pin_count": r.pin_count,
        "pitch": r.pitch,
        "package_d": float(r.package_d),
        "package_e": float(r.package_e),
        "package_a": float(r.package_a) if r.package_a is not None else None,
        "company_name": r.company_name,
        "contact_name": r.contact_name,
        "contact_email": r.contact_email,
        "contact_phone": r.contact_phone,
        "quantity": r.quantity,
        "desired_delivery": r.desired_delivery.isoformat() if r.desired_delivery else None,
        "message": r.message,
        "status": r.status,
        "erp_inquiry_id": r.erp_inquiry_id,
        "admin_note": r.admin_note,
        "created_at": r.created_at.isoformat(),
    }


@router.patch("/quick-quotes/{item_id}")
def patch_quick_quote(
    item_id: int,
    body: StatusPatch,
    db: Session = Depends(get_db),
    _staff: StaffAccount = Depends(require_staff_roles("admin", "sales_admin")),
):
    row = db.get(QuickQuoteInquiry, item_id)
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    if body.status is not None:
        row.status = body.status
    if body.admin_note is not None:
        row.admin_note = body.admin_note
    db.commit()
    return {"success": True}


@router.get("/contacts")
def list_contacts(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    q: str | None = None,
    db: Session = Depends(get_db),
    _staff: StaffAccount = Depends(require_staff_roles("admin", "sales_admin")),
):
    total, rows = _paginate_query(
        ContactInquiry,
        db,
        page,
        size,
        status_filter,
        q,
        ContactInquiry.status,
        [ContactInquiry.company_name, ContactInquiry.contact_email, ContactInquiry.subject],
    )
    # 동일 이메일 제출 횟수 집계
    from sqlalchemy import func as sa_func
    emails = [r.contact_email for r in rows]
    count_map: dict[str, int] = {}
    if emails:
        counts = db.execute(
            select(ContactInquiry.contact_email, sa_func.count().label("cnt"))
            .where(ContactInquiry.contact_email.in_(emails))
            .group_by(ContactInquiry.contact_email)
        ).all()
        count_map = {row.contact_email: row.cnt for row in counts}

    return {
        "total": total,
        "page": page,
        "items": [
            {
                "id": r.id,
                "category": r.category,
                "company_name": r.company_name,
                "contact_name": r.contact_name,
                "contact_phone": r.contact_phone,
                "contact_email": r.contact_email,
                "subject": r.subject,
                "message": r.message,
                "status": r.status,
                "attachment_name": r.attachment_name,
                "has_attachment": bool(r.attachment_path),
                "contact_count": count_map.get(r.contact_email, 1),
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ],
    }


@router.patch("/contacts/{item_id}")
def patch_contact(
    item_id: int,
    body: StatusPatch,
    db: Session = Depends(get_db),
    _staff: StaffAccount = Depends(require_staff_roles("admin", "sales_admin")),
):
    row = db.get(ContactInquiry, item_id)
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    if body.status is not None:
        row.status = body.status
    if body.admin_note is not None:
        row.admin_note = body.admin_note
    db.commit()
    return {"success": True}


@router.get("/contacts/{item_id}/detail")
def get_contact_detail(
    item_id: int,
    db: Session = Depends(get_db),
    _staff: StaffAccount = Depends(require_staff_roles("admin", "sales_admin")),
):
    r = db.get(ContactInquiry, item_id)
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    # 동일 이메일의 다른 문의 목록
    others = db.scalars(
        select(ContactInquiry)
        .where(ContactInquiry.contact_email == r.contact_email, ContactInquiry.id != r.id)
        .order_by(ContactInquiry.created_at.desc())
        .limit(10)
    ).all()
    return {
        "id": r.id,
        "category": r.category,
        "company_name": r.company_name,
        "contact_name": r.contact_name,
        "contact_email": r.contact_email,
        "contact_phone": r.contact_phone,
        "subject": r.subject,
        "message": r.message,
        "status": r.status,
        "admin_note": r.admin_note,
        "attachment_name": r.attachment_name,
        "has_attachment": bool(r.attachment_path),
        "created_at": r.created_at.isoformat(),
        "other_contacts": [
            {"id": o.id, "subject": o.subject, "created_at": o.created_at.isoformat()}
            for o in others
        ],
    }


@router.get("/contacts/{item_id}/attachment")
def download_contact_attachment(
    item_id: int,
    db: Session = Depends(get_db),
    _staff: StaffAccount = Depends(require_staff_roles("admin", "sales_admin")),
):
    row = db.get(ContactInquiry, item_id)
    if not row or not row.attachment_path:
        raise HTTPException(status_code=404, detail="No attachment")
    path = PROJECT_ROOT / row.attachment_path
    if not path.is_file():
        raise HTTPException(status_code=404, detail="File missing")
    return FileResponse(path, filename=row.attachment_name or path.name)


@router.get("/users")
def list_users(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    q: str | None = None,
    db: Session = Depends(get_db),
    _staff: StaffAccount = Depends(require_staff_roles("admin", "sales_admin")),
):
    query = select(User).order_by(User.created_at.desc())
    count_q = select(func.count()).select_from(User)
    if q:
        like = f"%{q}%"
        cond = or_(User.email.ilike(like), User.company_name.ilike(like))
        query = query.where(cond)
        count_q = count_q.where(cond)
    total = db.scalar(count_q) or 0
    rows = db.scalars(query.offset((page - 1) * size).limit(size)).all()
    return {
        "total": total,
        "page": page,
        "items": [
            {
                "id": u.id,
                "email": u.email,
                "company_name": u.company_name,
                "membership_tier": u.membership_tier,
                "email_verified": u.email_verified_at is not None,
                "created_at": u.created_at.isoformat(),
            }
            for u in rows
        ],
    }


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    _staff: StaffAccount = Depends(require_staff_roles("sales_admin")),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # Quick Quote PII 익명화 (기록은 보존)
    db.execute(
        __import__("sqlalchemy").update(QuickQuoteInquiry)
        .where(QuickQuoteInquiry.contact_email == user.email)
        .values(contact_name="탈퇴회원", company_name="탈퇴회원", contact_email="deleted@deleted", contact_phone=None)
    )
    db.delete(user)
    db.commit()
    return {"success": True}


@router.patch("/users/{user_id}/membership")
def patch_membership(
    user_id: int,
    body: MembershipPatch,
    db: Session = Depends(get_db),
    staff: StaffAccount = Depends(require_staff_roles("sales_admin")),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    now = datetime.now(timezone.utc)
    user.membership_tier = body.membership_tier
    if body.membership_tier == "verified":
        user.verified_at = now
        user.verified_by_staff_id = staff.id
        db.commit()
        try:
            send_membership_verified_email(user, "ko")
        except Exception:
            logger.exception("승인 메일 실패 user_id=%s", user.id)
    else:
        user.verified_at = None
        user.verified_by_staff_id = None
        db.commit()

    return {"success": True, "membership_tier": user.membership_tier}


# ── Wizard Quotes 관리 ───────────────────────────────────────────────────────

@router.get("/wizard-quotes")
def list_wizard_quotes(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    q: str | None = None,
    db: Session = Depends(get_db),
    _staff: StaffAccount = Depends(require_staff_roles("admin", "sales_admin")),
):
    query = select(WizardQuote).order_by(WizardQuote.created_at.desc())
    count_q = select(func.count()).select_from(WizardQuote)
    if status_filter:
        query = query.where(WizardQuote.status == status_filter)
        count_q = count_q.where(WizardQuote.status == status_filter)
    if q:
        like = f"%{q}%"
        cond = or_(
            WizardQuote.contact_email.ilike(like),
            WizardQuote.contact_company.ilike(like),
            WizardQuote.ic_code.ilike(like),
        )
        query = query.where(cond)
        count_q = count_q.where(cond)
    total = db.scalar(count_q) or 0
    rows = db.scalars(query.offset((page - 1) * size).limit(size)).all()
    return {
        "total": total,
        "page": page,
        "items": [
            {
                "id": r.id,
                "series": r.series,
                "ic_code": r.ic_code,
                "socket_type_name": r.socket_type_name,
                "pin_count": r.pin_count,
                "quantity": r.quantity,
                "matched": r.matched,
                "total_price": r.total_price,
                "currency": r.currency,
                "status": r.status,
                "membership_tier": r.membership_tier,
                "contact_email": r.contact_email,
                "contact_company": r.contact_company,
                "contact_name": r.contact_name,
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ],
    }


@router.get("/wizard-quotes/{item_id}")
def get_wizard_quote(
    item_id: int,
    db: Session = Depends(get_db),
    _staff: StaffAccount = Depends(require_staff_roles("admin", "sales_admin")),
):
    r = db.get(WizardQuote, item_id)
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    return {
        "id": r.id,
        "lang": r.lang,
        "series": r.series,
        "ic_type": r.ic_type,
        "ic_code": r.ic_code,
        "ic_package_code": r.ic_package_code,
        "dimension_d": float(r.dimension_d) if r.dimension_d is not None else None,
        "dimension_e": float(r.dimension_e) if r.dimension_e is not None else None,
        "dimension_a": float(r.dimension_a) if r.dimension_a is not None else None,
        "pitch": r.pitch,
        "pin_count": r.pin_count,
        "socket_type_id": r.socket_type_id,
        "socket_type_name": r.socket_type_name,
        "quantity": r.quantity,
        "cover_type_id": r.cover_type_id,
        "material_type_id": r.material_type_id,
        "spec_notes": r.spec_notes,
        "attachment_name": r.attachment_name,
        "matched": r.matched,
        "unit_price": r.unit_price,
        "currency": r.currency,
        "total_price": r.total_price,
        "lead_time_label": r.lead_time_label,
        "contact_name": r.contact_name,
        "contact_company": r.contact_company,
        "contact_email": r.contact_email,
        "contact_phone": r.contact_phone,
        "membership_tier": r.membership_tier,
        "status": r.status,
        "admin_note": r.admin_note,
        "created_at": r.created_at.isoformat(),
    }


@router.patch("/wizard-quotes/{item_id}")
def patch_wizard_quote(
    item_id: int,
    body: WizardStatusPatch,
    db: Session = Depends(get_db),
    _staff: StaffAccount = Depends(require_staff_roles("admin", "sales_admin")),
):
    row = db.get(WizardQuote, item_id)
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    if body.status is not None:
        row.status = body.status
    if body.admin_note is not None:
        row.admin_note = body.admin_note
    db.commit()
    return {"success": True}


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(
    db: Session = Depends(get_db),
    _staff: StaffAccount = Depends(require_staff_roles("admin", "sales_admin")),
):
    KST = timezone(timedelta(hours=9))
    now = datetime.now(KST)
    month_start = datetime(now.year, now.month, 1, tzinfo=KST)

    # 이번 달 통계
    wq_month = db.scalar(select(func.count()).select_from(WizardQuote).where(WizardQuote.created_at >= month_start)) or 0
    qq_month = db.scalar(select(func.count()).select_from(QuickQuoteInquiry).where(QuickQuoteInquiry.created_at >= month_start)) or 0
    # 신규 회원: 이번 달 이메일 인증 완료 기준
    users_month = db.scalar(select(func.count()).select_from(User).where(User.email_verified_at >= month_start)) or 0
    contacts_month = db.scalar(select(func.count()).select_from(ContactInquiry).where(ContactInquiry.created_at >= month_start)) or 0

    # 미처리 현황
    wq_pending = db.scalar(select(func.count()).select_from(WizardQuote).where(WizardQuote.status == "pending")) or 0
    # Quick Quote: closed가 아닌 것 전부 (pending + sent_to_erp)
    qq_pending = db.scalar(select(func.count()).select_from(QuickQuoteInquiry).where(QuickQuoteInquiry.status != "closed")) or 0
    contacts_pending = db.scalar(select(func.count()).select_from(ContactInquiry).where(ContactInquiry.status == "new")) or 0
    verified_users = db.scalar(select(func.count()).select_from(User).where(User.membership_tier == "verified", User.is_active.is_(True))) or 0

    # 만료 임박 견적: pending 상태이며 접수 5일 이상 경과
    cutoff = now - timedelta(days=5)
    expiring_rows = db.execute(
        select(WizardQuote.id, WizardQuote.ic_code, WizardQuote.contact_company, WizardQuote.created_at)
        .where(WizardQuote.status == "pending", WizardQuote.created_at < cutoff)
        .order_by(WizardQuote.created_at.asc())
        .limit(10)
    ).all()

    expiring_soon = []
    for row in expiring_rows:
        created_kst = row.created_at.astimezone(KST) if row.created_at.tzinfo else row.created_at.replace(tzinfo=KST)
        expiry_dt = created_kst + timedelta(days=7)
        days_left = (expiry_dt.date() - now.date()).days
        expiring_soon.append({
            "id": row.id,
            "ic_code": row.ic_code,
            "contact_company": row.contact_company,
            "created_at": row.created_at.isoformat(),
            "days_until_expiry": max(days_left, 0),
        })

    return {
        "this_month": {
            "wizard_quotes": wq_month,
            "quick_quotes": qq_month,
            "new_users": users_month,
            "contacts": contacts_month,
        },
        "pending": {
            "wizard_quotes": wq_pending,
            "quick_quotes": qq_pending,
            "contacts": contacts_pending,
            "verified_users": verified_users,
        },
        "expiring_soon": expiring_soon,
    }
