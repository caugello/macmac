"""
Rate limiting middleware with Redis-backed shared state.
Falls back to in-memory storage if Redis is unavailable.
"""

import logging
import os
import time
from collections import defaultdict
from collections.abc import Callable

import redis
from fastapi import HTTPException, Request
from starlette.middleware.base import BaseHTTPMiddleware

from services.config import get_config

logger = logging.getLogger(__name__)

config = get_config()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware backed by Redis for shared state across workers/replicas.
    Falls back to per-process in-memory storage if Redis is unavailable.
    """

    def __init__(self, app, calls: int = 100, period: int = 60):
        super().__init__(app)
        self.default_calls = calls
        self.default_period = period
        self._fallback_clients = defaultdict(lambda: defaultdict(list))

        self._redis = None
        try:
            cache_cfg = config.cache
            self._redis = redis.Redis(
                host=cache_cfg.host,
                port=cache_cfg.port,
                db=cache_cfg.db,
                password=os.getenv("REDIS_PASSWORD"),
                socket_timeout=cache_cfg.socket_timeout,
                socket_connect_timeout=cache_cfg.socket_connect_timeout,
                decode_responses=True,
            )
            self._redis.ping()
            logger.info("Rate limiter using Redis backend")
        except Exception:
            self._redis = None
            logger.warning("Redis unavailable for rate limiting, using in-memory fallback")

    def _check_redis(self, key: str, calls: int, period: int) -> tuple[bool, int]:
        """Check rate limit using Redis INCR+EXPIRE. Returns (exceeded, current_count)."""
        pipe = self._redis.pipeline()
        pipe.incr(key)
        pipe.expire(key, period)
        result = pipe.execute()
        current = result[0]
        return current > calls, current

    def _check_memory(
        self, client_ip: str, path_key: str, calls: int, period: int
    ) -> tuple[bool, int]:
        """Check rate limit using in-memory storage. Returns (exceeded, current_count)."""
        now = time.time()
        self._fallback_clients[client_ip][path_key] = [
            ts for ts in self._fallback_clients[client_ip][path_key] if now - ts < period
        ]
        current = len(self._fallback_clients[client_ip][path_key])
        if current >= calls:
            return True, current
        self._fallback_clients[client_ip][path_key].append(now)
        return False, current + 1

    async def dispatch(self, request: Request, call_next: Callable):
        client_ip = request.client.host if request.client else "unknown"

        if request.url.path == "/healthz":
            return await call_next(request)

        calls, period = get_rate_limit_for_path(request.url.path)

        if self._redis:
            try:
                key = f"ratelimit:{client_ip}:{request.url.path}"
                exceeded, current = self._check_redis(key, calls, period)
            except Exception:
                exceeded, current = self._check_memory(client_ip, request.url.path, calls, period)
        else:
            exceeded, current = self._check_memory(client_ip, request.url.path, calls, period)

        if exceeded:
            logger.warning(f"Rate limit exceeded for {client_ip} on {request.url.path}")
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later.",
                headers={"Retry-After": str(period)},
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(calls)
        response.headers["X-RateLimit-Remaining"] = str(calls - current)
        response.headers["X-RateLimit-Reset"] = str(int(time.time() + period))

        return response


def get_rate_limit_for_path(path: str) -> tuple[int, int]:
    """
    Get rate limit configuration for a specific path.
    Returns (calls, period_in_seconds).
    """
    for endpoint_path, endpoint_config in config.rate_limiting.endpoints.items():
        segment = "/" + endpoint_path.strip("/")
        if path.endswith(segment) or (segment + "/") in (path + "/"):
            return (endpoint_config.calls, endpoint_config.period)

    return (config.rate_limiting.default.calls, config.rate_limiting.default.period)
