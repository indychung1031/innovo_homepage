"""비밀번호 해싱·토큰 생성."""

import hashlib
import re
import secrets

import bcrypt

PASSWORD_PATTERN = re.compile(r"^(?=.*[A-Za-z])(?=.*\d).{8,}$")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def validate_password_strength(password: str) -> bool:
    """최소 8자, 영문+숫자 포함."""
    return bool(PASSWORD_PATTERN.match(password))


def generate_raw_token() -> str:
    """URL-safe 원문 토큰 — DB에는 해시만 저장."""
    return secrets.token_urlsafe(32)


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def generate_otp_code() -> str:
    """6자리 이메일 OTP."""
    return f"{secrets.randbelow(1_000_000):06d}"
