"""FastAPI Depends — JWT 인증."""

from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.database import get_db
from backend.models import StaffAccount, User
from backend.utils.jwt_utils import decode_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="인증이 필요합니다.")
    settings = get_settings()
    try:
        payload = decode_token(credentials.credentials, secret=settings.secret_key, expected_type="access")
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.") from None

    user = db.get(User, int(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="사용자를 찾을 수 없습니다.")
    return user


def get_current_staff(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Session = Depends(get_db),
) -> StaffAccount:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin 인증이 필요합니다.")
    settings = get_settings()
    try:
        payload = decode_token(
            credentials.credentials, secret=settings.admin_secret_key, expected_type="admin"
        )
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 Admin 토큰입니다.") from None

    staff = db.get(StaffAccount, int(payload["sub"]))
    if not staff or not staff.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Staff 계정을 찾을 수 없습니다.")
    staff._jwt_roles = payload.get("roles", staff.roles)  # type: ignore[attr-defined]
    return staff


def require_staff_roles(*allowed: str):
    """sales_admin, admin 등 역할 검사."""

    def _checker(staff: StaffAccount = Depends(get_current_staff)) -> StaffAccount:
        roles = getattr(staff, "_jwt_roles", staff.roles) or []
        if not any(r in roles for r in allowed):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="권한이 없습니다.")
        return staff

    return _checker
