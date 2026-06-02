"""회원 계정 관련 API (마이페이지)."""

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.deps import get_current_user
from backend.models import QuickQuoteInquiry, User

router = APIRouter(prefix="/api/account", tags=["account"])


class QuoteItem(BaseModel):
    id: int
    ic_package_type: str
    package_d: float
    package_e: float
    pin_count: int
    quantity: int | None
    created_at: datetime
    status: str


class QuoteListResponse(BaseModel):
    items: list[QuoteItem]
    total: int
    page: int
    size: int


@router.get("/quotes", response_model=QuoteListResponse)
def my_quotes(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> QuoteListResponse:
    base = select(QuickQuoteInquiry).where(QuickQuoteInquiry.contact_email == user.email)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.scalars(
        base.order_by(QuickQuoteInquiry.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    ).all()
    items = [
        QuoteItem(
            id=r.id,
            ic_package_type=r.ic_package_type,
            package_d=float(r.package_d),
            package_e=float(r.package_e),
            pin_count=r.pin_count,
            quantity=r.quantity,
            created_at=r.created_at,
            status=r.status,
        )
        for r in rows
    ]
    return QuoteListResponse(items=items, total=total, page=page, size=size)
