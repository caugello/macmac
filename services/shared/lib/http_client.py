import asyncio
import logging
import time
from urllib.parse import urlparse

import httpx

from services.framework.logging import current_trace_id
from services.framework.tracing import TRACE_ID_HEADER
from services.framework.user_context import current_token

logger = logging.getLogger(__name__)

HTTPX_TIMEOUT = 30.0

_http_client: httpx.AsyncClient | None = None


def get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(timeout=HTTPX_TIMEOUT)
    return _http_client


async def close_http_client():
    global _http_client
    if _http_client and not _http_client.is_closed:
        await _http_client.aclose()
        _http_client = None


def context_headers() -> dict[str, str]:
    headers: dict[str, str] = {TRACE_ID_HEADER: current_trace_id.get()}
    token = current_token.get()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, recovery_timeout: float = 30.0):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time: float | None = None
        self.state = "closed"

    def record_success(self):
        self.failure_count = 0
        self.state = "closed"

    def record_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = "open"
            logger.warning("Circuit breaker opened after %d failures", self.failure_count)

    def can_proceed(self) -> bool:
        if self.state == "closed":
            return True
        if self.state == "open":
            elapsed = time.time() - (self.last_failure_time or 0)
            if elapsed >= self.recovery_timeout:
                self.state = "half_open"
                return True
            return False
        return True


_breakers: dict[str, CircuitBreaker] = {}


async def service_request(method: str, url: str, retries: int = 1, **kwargs) -> httpx.Response:
    host = urlparse(url).netloc
    breaker = _breakers.setdefault(host, CircuitBreaker())

    if not breaker.can_proceed():
        raise httpx.ConnectError(f"Circuit open for {host}")

    kwargs.setdefault("headers", {}).update(context_headers())
    client = get_http_client()

    last_exc: httpx.ConnectError | httpx.TimeoutException | None = None
    for attempt in range(1 + retries):
        try:
            response = await client.request(method, url, **kwargs)
            breaker.record_success()
            return response
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            last_exc = exc
            if attempt < retries:
                await asyncio.sleep(0.5 * (attempt + 1))

    breaker.record_failure()
    raise last_exc  # type: ignore[misc]
