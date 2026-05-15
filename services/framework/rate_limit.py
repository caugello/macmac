"""
Simple in-memory rate limiting middleware.
For production, use Redis-based rate limiting.
"""

import time
from collections import defaultdict
from typing import Callable
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
import logging

from services.config import get_config

logger = logging.getLogger(__name__)

# Load configuration
config = get_config()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple in-memory rate limiting.

    WARNING: This is per-process only. In production with multiple workers,
    use Redis-based rate limiting for shared state.
    """

    def __init__(self, app, calls: int = 100, period: int = 60):
        super().__init__(app)
        self.default_calls = calls  # Default number of calls allowed
        self.default_period = period  # Default time period in seconds
        self.clients = defaultdict(lambda: defaultdict(list))  # IP -> path -> list of timestamps

    async def dispatch(self, request: Request, call_next: Callable):
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"

        # Skip rate limiting for health checks
        if request.url.path == "/healthz":
            return await call_next(request)

        # Get path-specific rate limits
        calls, period = get_rate_limit_for_path(request.url.path)

        now = time.time()
        path_key = request.url.path

        # Clean old timestamps for this client and path
        self.clients[client_ip][path_key] = [
            ts for ts in self.clients[client_ip][path_key] if now - ts < period
        ]

        # Check if client has exceeded rate limit
        if len(self.clients[client_ip][path_key]) >= calls:
            logger.warning(f"Rate limit exceeded for {client_ip} on {request.url.path}")
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later.",
                headers={"Retry-After": str(period)},
            )

        # Add current timestamp
        self.clients[client_ip][path_key].append(now)

        # Add rate limit headers to response
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(calls)
        response.headers["X-RateLimit-Remaining"] = str(
            calls - len(self.clients[client_ip][path_key])
        )
        response.headers["X-RateLimit-Reset"] = str(int(now + period))

        return response


def get_rate_limit_for_path(path: str) -> tuple[int, int]:
    """
    Get rate limit configuration for a specific path.
    Returns (calls, period_in_seconds).

    Configuration loaded from config.yaml.
    """
    for endpoint_path, endpoint_config in config.rate_limiting.endpoints.items():
        segment = "/" + endpoint_path.strip("/")
        if path.endswith(segment) or (segment + "/") in (path + "/"):
            return (endpoint_config.calls, endpoint_config.period)

    # Default rate limit
    return (config.rate_limiting.default.calls, config.rate_limiting.default.period)
