"""B2B 회원 Auth API."""

import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.database import get_db
from backend.deps import get_current_user
from backend.models import EmailVerificationToken, PasswordResetToken, User
from backend.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    LoginResponse,
    MessageResponse,
    RegisterRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    UpdateProfileRequest,
    UserPublic,
)
from backend.utils.auth_email import send_password_reset_email, send_verification_email
from backend.utils.jwt_utils import create_refresh_token, create_user_access_token, decode_token
from backend.utils.rate_limit import check_rate_limit
from backend.utils.recaptcha import verify_recaptcha
from backend.utils.security import generate_raw_token, hash_password, hash_token, verify_password

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

REFRESH_COOKIE = "innovo_refresh_token"


def _user_public(user: User) -> UserPublic:
    return UserPublic(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        company_name=user.company_name,
        phone=user.phone or None,
        membership_tier=user.membership_tier,
        email_verified=user.email_verified_at is not None,
        created_at=user.created_at,
    )


def _set_refresh_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    max_age = settings.jwt_refresh_expire_days * 86400
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=token,
        httponly=True,
        secure=not settings.is_development,
        samesite="lax",
        max_age=max_age,
        path="/",
    )


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> MessageResponse:
    check_rate_limit(request, limit=5, bucket_suffix="auth-register")
    client_ip = request.client.host if request.client else None
    if not await verify_recaptcha(payload.recaptcha_token, client_ip):
        raise HTTPException(status_code=400, detail="reCAPTCHA 검증 실패")

    existing = db.scalar(select(User).where(User.email == str(payload.email)))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 등록된 이메일입니다.")

    now = datetime.now(timezone.utc)
    user = User(
        email=str(payload.email),
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        company_name=payload.company_name,
        phone=payload.phone,
        privacy_agreed_at=now,
        terms_agreed_at=now,
    )
    db.add(user)
    db.flush()

    raw = generate_raw_token()
    token_row = EmailVerificationToken(
        user_id=user.id,
        token_hash=hash_token(raw),
        expires_at=now + timedelta(hours=24),
    )
    db.add(token_row)
    db.commit()

    try:
        send_verification_email(user, raw, payload.lang)
    except Exception:
        logger.exception("인증 메일 발송 실패 user_id=%s", user.id)

    msg = (
        "인증 메일을 발송했습니다. 받은편지함을 확인해 주세요."
        if payload.lang == "ko"
        else "Verification email sent. Please check your inbox."
    )
    return MessageResponse(message=msg)


@router.post("/login", response_model=LoginResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> LoginResponse:
    check_rate_limit(request, limit=10, bucket_suffix="auth-login")
    user = db.scalar(select(User).where(User.email == str(payload.email)))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="비활성화된 계정입니다.")
    if user.email_verified_at is None:
        raise HTTPException(status_code=403, detail="email_not_verified")

    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    settings = get_settings()
    access = create_user_access_token(user.id, user.email, user.membership_tier)
    refresh = create_refresh_token(user.id)
    _set_refresh_cookie(response, refresh)

    return LoginResponse(
        access_token=access,
        expires_in=settings.jwt_access_expire_minutes * 60,
        user=_user_public(user),
    )


@router.post("/logout", response_model=MessageResponse)
def logout(response: Response) -> MessageResponse:
    response.delete_cookie(REFRESH_COOKIE, path="/")
    return MessageResponse(message="Logged out.")


@router.post("/refresh", response_model=LoginResponse)
def refresh_token(request: Request, response: Response, db: Session = Depends(get_db)) -> LoginResponse:
    check_rate_limit(request, limit=20, bucket_suffix="auth-refresh")
    raw = request.cookies.get(REFRESH_COOKIE)
    if not raw:
        raise HTTPException(status_code=401, detail="Refresh token 없음")
    settings = get_settings()
    try:
        payload = decode_token(raw, secret=settings.secret_key, expected_type="refresh")
    except ValueError:
        raise HTTPException(status_code=401, detail="유효하지 않은 refresh token") from None

    user = db.get(User, int(payload["sub"]))
    if not user or not user.is_active or user.email_verified_at is None:
        raise HTTPException(status_code=401, detail="사용자를 찾을 수 없습니다.")

    access = create_user_access_token(user.id, user.email, user.membership_tier)
    new_refresh = create_refresh_token(user.id)
    _set_refresh_cookie(response, new_refresh)

    return LoginResponse(
        access_token=access,
        expires_in=settings.jwt_access_expire_minutes * 60,
        user=_user_public(user),
    )


@router.get("/verify-email", response_model=MessageResponse)
def verify_email(token: str, db: Session = Depends(get_db)) -> MessageResponse:
    now = datetime.now(timezone.utc)
    token_hash = hash_token(token)
    row = db.scalar(
        select(EmailVerificationToken).where(EmailVerificationToken.token_hash == token_hash)
    )
    if not row or row.used_at or row.expires_at < now:
        raise HTTPException(status_code=400, detail="유효하지 않거나 만료된 토큰입니다.")

    user = db.get(User, row.user_id)
    if not user:
        raise HTTPException(status_code=400, detail="사용자를 찾을 수 없습니다.")

    user.email_verified_at = now
    row.used_at = now
    db.commit()
    return MessageResponse(message="Email verified. You can log in now.")


@router.post("/resend-verification", response_model=MessageResponse)
async def resend_verification(
    payload: ResendVerificationRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> MessageResponse:
    check_rate_limit(request, limit=3, bucket_suffix=f"resend-{payload.email}")
    user = db.scalar(select(User).where(User.email == str(payload.email)))
    if user and user.email_verified_at is None:
        now = datetime.now(timezone.utc)
        raw = generate_raw_token()
        db.add(
            EmailVerificationToken(
                user_id=user.id,
                token_hash=hash_token(raw),
                expires_at=now + timedelta(hours=24),
            )
        )
        db.commit()
        try:
            send_verification_email(user, raw, payload.lang)
        except Exception:
            logger.exception("재발송 실패 user_id=%s", user.id)

    msg = (
        "등록된 이메일이면 인증 메일을 발송했습니다."
        if payload.lang == "ko"
        else "If the email is registered, a verification message was sent."
    )
    return MessageResponse(message=msg)


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> MessageResponse:
    check_rate_limit(request, limit=3, bucket_suffix="auth-forgot")
    user = db.scalar(select(User).where(User.email == str(payload.email)))
    if user and user.is_active:
        now = datetime.now(timezone.utc)
        raw = generate_raw_token()
        db.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=hash_token(raw),
                expires_at=now + timedelta(hours=1),
            )
        )
        db.commit()
        try:
            send_password_reset_email(user, raw, payload.lang)
        except Exception:
            logger.exception("재설정 메일 실패 user_id=%s", user.id)

    msg = (
        "해당 이메일로 계정이 있으면 재설정 링크를 발송했습니다."
        if payload.lang == "ko"
        else "If an account exists for this email, a reset link has been sent."
    )
    return MessageResponse(message=msg)


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> MessageResponse:
    check_rate_limit(request, limit=10, bucket_suffix="auth-reset")
    now = datetime.now(timezone.utc)
    token_hash = hash_token(payload.token)
    row = db.scalar(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
    )
    if not row or row.used_at or row.expires_at < now:
        raise HTTPException(status_code=400, detail="유효하지 않거나 만료된 토큰입니다.")

    user = db.get(User, row.user_id)
    if not user:
        raise HTTPException(status_code=400, detail="사용자를 찾을 수 없습니다.")

    user.password_hash = hash_password(payload.new_password)
    row.used_at = now
    db.commit()
    return MessageResponse(message="Password updated. You can log in now.")


@router.get("/me", response_model=UserPublic)
def me(user: User = Depends(get_current_user)) -> UserPublic:
    return _user_public(user)


@router.patch("/profile", response_model=UserPublic)
def update_profile(
    payload: UpdateProfileRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserPublic:
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.company_name is not None:
        user.company_name = payload.company_name
    if payload.phone is not None:
        user.phone = payload.phone
    db.commit()
    db.refresh(user)
    return _user_public(user)


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MessageResponse:
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="현재 비밀번호가 올바르지 않습니다.")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return MessageResponse(message="비밀번호가 변경되었습니다.")


@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    anon_email = f"deleted_{user.id}@deleted"

    # 견적 기록 익명화 (5년 보관)
    from sqlalchemy import update as sql_update
    from backend.models import QuickQuoteInquiry
    db.execute(
        sql_update(QuickQuoteInquiry)
        .where(QuickQuoteInquiry.contact_email == user.email)
        .values(contact_name="탈퇴회원", contact_email="deleted@deleted", contact_phone=None)
    )

    # 사용자 익명화
    user.full_name = "탈퇴회원"
    user.email = anon_email
    user.phone = ""
    user.password_hash = hash_password(secrets.token_urlsafe(32))
    user.is_active = False
    user.email_verified_at = None
    db.commit()

    response.delete_cookie(REFRESH_COOKIE, path="/")
