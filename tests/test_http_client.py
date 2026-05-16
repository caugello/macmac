"""Tests for HTTP client with circuit breaker."""

import time
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from services.shared.lib.http_client import CircuitBreaker, service_request

# ===== CircuitBreaker state machine =====


@pytest.mark.unit
def test_circuit_breaker_starts_closed():
    cb = CircuitBreaker()
    assert cb.state == "closed"
    assert cb.can_proceed() is True


@pytest.mark.unit
def test_circuit_breaker_stays_closed_below_threshold():
    cb = CircuitBreaker(failure_threshold=5)
    for _ in range(4):
        cb.record_failure()
    assert cb.state == "closed"
    assert cb.can_proceed() is True


@pytest.mark.unit
def test_circuit_breaker_opens_at_threshold():
    cb = CircuitBreaker(failure_threshold=5)
    for _ in range(5):
        cb.record_failure()
    assert cb.state == "open"
    assert cb.can_proceed() is False


@pytest.mark.unit
def test_circuit_breaker_recovers_after_timeout():
    cb = CircuitBreaker(failure_threshold=2, recovery_timeout=1.0)
    cb.record_failure()
    cb.record_failure()
    assert cb.state == "open"
    assert cb.can_proceed() is False

    cb.last_failure_time = time.time() - 2.0
    assert cb.can_proceed() is True
    assert cb.state == "half_open"


@pytest.mark.unit
def test_circuit_breaker_closes_on_success():
    cb = CircuitBreaker(failure_threshold=2, recovery_timeout=0.0)
    cb.record_failure()
    cb.record_failure()
    assert cb.state == "open"

    cb.last_failure_time = time.time() - 1.0
    cb.can_proceed()
    assert cb.state == "half_open"

    cb.record_success()
    assert cb.state == "closed"
    assert cb.failure_count == 0


@pytest.mark.unit
def test_circuit_breaker_reopens_on_half_open_failure():
    cb = CircuitBreaker(failure_threshold=2, recovery_timeout=0.0)
    cb.record_failure()
    cb.record_failure()

    cb.last_failure_time = time.time() - 1.0
    cb.can_proceed()
    assert cb.state == "half_open"

    cb.record_failure()
    assert cb.state == "open"


# ===== service_request integration =====


@pytest.mark.asyncio
@pytest.mark.unit
async def test_service_request_success():
    from services.shared.lib import http_client

    old_breakers = http_client._breakers.copy()
    http_client._breakers.clear()

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200

    mock_client = AsyncMock()
    mock_client.request = AsyncMock(return_value=mock_response)

    try:
        with patch.object(http_client, "get_http_client", return_value=mock_client):
            result = await service_request("GET", "http://test-host:8000/api/test")

        assert result.status_code == 200
        host_breaker = http_client._breakers.get("test-host:8000")
        assert host_breaker is not None
        assert host_breaker.state == "closed"
        assert host_breaker.failure_count == 0
    finally:
        http_client._breakers = old_breakers


@pytest.mark.asyncio
@pytest.mark.unit
async def test_service_request_circuit_open():
    from services.shared.lib import http_client

    old_breakers = http_client._breakers.copy()

    breaker = CircuitBreaker(failure_threshold=2)
    breaker.record_failure()
    breaker.record_failure()
    assert breaker.state == "open"

    http_client._breakers = {"open-host:8000": breaker}

    try:
        with pytest.raises(httpx.ConnectError, match="Circuit open"):
            await service_request("GET", "http://open-host:8000/api/test")
    finally:
        http_client._breakers = old_breakers


@pytest.mark.asyncio
@pytest.mark.unit
async def test_service_request_retries_on_transient_failure():
    from services.shared.lib import http_client

    old_breakers = http_client._breakers.copy()
    http_client._breakers.clear()

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200

    call_count = 0

    async def flaky_request(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise httpx.ConnectError("transient failure")
        return mock_response

    mock_client = AsyncMock()
    mock_client.request = flaky_request

    try:
        with patch.object(http_client, "get_http_client", return_value=mock_client):
            with patch("services.shared.lib.http_client.asyncio.sleep", new_callable=AsyncMock):
                result = await service_request("GET", "http://retry-host:8000/api/test", retries=1)

        assert result.status_code == 200
        assert call_count == 2
        host_breaker = http_client._breakers.get("retry-host:8000")
        assert host_breaker.state == "closed"
    finally:
        http_client._breakers = old_breakers
