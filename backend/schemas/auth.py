"""Auth API 스키마."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, model_validator

from backend.utils.security import validate_password_strength

LangCode = Literal["en", "ko"]


class RegisterRequest(BaseModel):
    full_name: str = Field(max_length=50)
    company_name: str = Field(max_length=100)
    email: EmailStr
    phone: str = Field(max_length=30)
    password: str = Field(min_length=8, max_length=128)
    password_confirm: str
    privacy_agreed: bool
    terms_agreed: bool
    recaptcha_token: str
    lang: LangCode = "en"

    @model_validator(mode="after")
    def check_passwords(self) -> "RegisterRequest":
        if self.password != self.password_confirm:
            raise ValueError("password_mismatch")
        if not validate_password_strength(self.password):
            raise ValueError("password_weak")
        if not self.privacy_agreed or not self.terms_agreed:
            raise ValueError("consent_required")
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    lang: LangCode = "en"


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)
    new_password_confirm: str

    @model_validator(mode="after")
    def check_passwords(self) -> "ResetPasswordRequest":
        if self.new_password != self.new_password_confirm:
            raise ValueError("password_mismatch")
        if not validate_password_strength(self.new_password):
            raise ValueError("password_weak")
        return self


class ResendVerificationRequest(BaseModel):
    email: EmailStr
    lang: LangCode = "en"


class UserPublic(BaseModel):
    id: int
    email: str
    full_name: str
    company_name: str
    phone: str | None
    membership_tier: str
    email_verified: bool
    created_at: datetime


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserPublic


class MessageResponse(BaseModel):
    success: bool = True
    message: str


class UpdateProfileRequest(BaseModel):
    full_name: str | None = Field(default=None, max_length=50)
    company_name: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=30)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)
    confirm_password: str

    @model_validator(mode="after")
    def check_passwords(self) -> "ChangePasswordRequest":
        if self.new_password != self.confirm_password:
            raise ValueError("password_mismatch")
        if not validate_password_strength(self.new_password):
            raise ValueError("password_weak")
        return self
