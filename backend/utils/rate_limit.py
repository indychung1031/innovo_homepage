"""IP 기준 단순 Rate limit (인메모리)."""

import time
from collections import defaultdict
from threading import Lock

from fastapi import HTTPException, Request, status

from backend.config import get_settings

_lock = Lock()
_request_log: dict[str, list[float]] = defaultdict(list)


def check_rate_limit(
    request: Request,
    limit: int | None = None,
    bucket_suffix: str = "",
) -> None:
    """
    분당 요청 횟수 제한.
    bucket_suffix: 엔드포인트별 버킷 분리 (예: contact, auth-login)
    """
    settings = get_settings()
    client_ip = request.client.host if request.client else "unknown"
    bucket_key = f"{client_ip}:{bucket_suffix}" if bucket_suffix else client_ip
    now = time.time()
    window_seconds = 60.0
    max_requests = limit if limit is not None else settings.rate_limit_per_minute

    with _lock:
        timestamps = [t for t in _request_log[bucket_key] if now - t < window_seconds]
        if len(timestamps) >= max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
            )
        timestamps.append(now)
        _request_log[bucket_key] = timestamps
