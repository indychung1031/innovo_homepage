"""Admin API 스키마."""

from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field

MembershipTier = Literal["general", "verified"]


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str


class AdminLoginChallengeResponse(BaseModel):
    success: bool = True
    requires_2fa: bool = True
    challenge_token: str
    message: str


class AdminVerify2FARequest(BaseModel):
    challenge_token: str
    otp_code: str = Field(min_length=6, max_length=6)


class AdminLoginSuccessResponse(BaseModel):
    success: bool = True
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    staff: dict[str, Any]


class StatusPatch(BaseModel):
    status: str | None = None
    admin_note: str | None = None


class MembershipPatch(BaseModel):
    membership_tier: MembershipTier


class WizardStatusPatch(BaseModel):
    status: str | None = None
    admin_note: str | None = None


class DashboardThisMonth(BaseModel):
    wizard_quotes: int
    quick_quotes: int
    new_users: int
    contacts: int


class DashboardPending(BaseModel):
    wizard_quotes: int
    quick_quotes: int
    contacts: int
    verified_users: int


class ExpiringSoonItem(BaseModel):
    id: int
    ic_code: str
    contact_company: str
    created_at: str
    days_until_expiry: int


class DashboardResponse(BaseModel):
    this_month: DashboardThisMonth
    pending: DashboardPending
    expiring_soon: list[ExpiringSoonItem]
