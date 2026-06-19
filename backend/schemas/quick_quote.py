"""Quick Quote API 요청·응답 스키마."""

import re
from datetime import date
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

IC_PACKAGE_TYPES = frozenset({"WLP", "BGA", "QFN", "DFN", "LGA", "QFP", "SOP", "WLCSP", "ETC"})
PITCH_PRESETS = frozenset({"0.4mm", "0.5mm", "0.65mm", "0.8mm", "1.0mm"})


def normalize_pitch(value: str) -> str:
    """직접입력 '0.35' → '0.35mm' 형식으로 통일."""
    cleaned = value.strip().lower().replace("mm", "").strip()
    if not re.fullmatch(r"\d+(\.\d+)?", cleaned):
        raise ValueError("피치는 숫자 형식이어야 합니다.")
    return f"{cleaned}mm"


class QuickQuoteCreate(BaseModel):
    """POST /api/quick-quote 요청 본문."""

    ic_package_type: str = Field(..., max_length=20)
    ic_code: str | None = Field(None, max_length=100)
    pin_count: int = Field(..., ge=1)
    pitch: str = Field(..., max_length=10)
    package_d: float = Field(..., gt=0, le=100)
    package_e: float = Field(..., gt=0, le=100)
    package_a: float | None = Field(None, gt=0, le=50)
    company_name: str = Field(..., min_length=1, max_length=100)
    contact_name: str = Field(..., min_length=1, max_length=50)
    contact_email: EmailStr
    contact_phone: str | None = Field(None, max_length=30)
    quantity: int | None = Field(None, ge=1)
    desired_delivery: date | None = None
    message: str | None = None
    recaptcha_token: str = Field(..., min_length=1)
    privacy_agreed: bool
    lang: Literal["en", "ko"] = "en"
    ic_type: str | None = Field(None, max_length=50)
    product_category: str | None = Field(None, max_length=30)

    @field_validator("ic_package_type")
    @classmethod
    def validate_package_type(cls, value: str) -> str:
        upper = value.strip().upper()
        if upper not in IC_PACKAGE_TYPES:
            allowed = ", ".join(sorted(IC_PACKAGE_TYPES))
            raise ValueError(f"ic_package_type은 다음 중 하나여야 합니다: {allowed}")
        return upper

    @field_validator("pitch")
    @classmethod
    def validate_pitch(cls, value: str) -> str:
        stripped = value.strip()
        if stripped in PITCH_PRESETS or stripped == "N/A":
            return stripped
        return normalize_pitch(stripped)

    @field_validator("privacy_agreed")
    @classmethod
    def validate_privacy(cls, value: bool) -> bool:
        if not value:
            raise ValueError("개인정보 수집 및 이용에 동의해야 합니다.")
        return value


class QuickQuoteResponse(BaseModel):
    """접수 성공 응답."""

    success: bool = True
    inquiry_id: int
    message: str
