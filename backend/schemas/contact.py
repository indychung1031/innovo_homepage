"""Contact API 스키마."""

from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

ContactCategory = Literal["test_socket", "probe_pin", "test_jig", "other"]
LangCode = Literal["en", "ko"]


class ContactCreate(BaseModel):
    category: ContactCategory
    company_name: str = Field(max_length=100)
    contact_name: str = Field(max_length=50)
    contact_email: EmailStr
    contact_phone: str | None = Field(default=None, max_length=30)
    subject: str = Field(max_length=200)
    message: str = Field(max_length=5000)
    privacy_agreed: bool
    recaptcha_token: str
    lang: LangCode = "en"

    @field_validator("privacy_agreed")
    @classmethod
    def must_agree(cls, v: bool) -> bool:
        if not v:
            raise ValueError("privacy_agreed_required")
        return v


class ContactResponse(BaseModel):
    success: bool = True
    inquiry_id: int
    message: str
