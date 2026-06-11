"""Tests for gateway middleware ordering and error-response behavior.

Covers the security fix from issue #187:
- Rate limiting must run *before* authentication (brute-force protection).
- CORS headers must be present on every response, including 401/429 errors.
- Rate-limit rejection must return a 429 Response, not raise an exception.
- Preflight OPTIONS requests must succeed without authentication.
"""

import os

import pytest

# Required before importing gateway/auth modules (they read JWT config at import).
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing-min-32-chars")
os.environ.setdefault("ENVIRONMENT", "development")

from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from services.framework.rate_limit import RateLimitMiddleware  # noqa: E402
from services.gateway.auth_middleware import AuthenticationMiddleware  # noqa: E402
from services.gateway.main import (  # noqa: E402
    SecurityHeadersMiddleware,
    app,
)
from services.gateway.middleware import GatewayLoggingMiddleware  # noqa: E402

ORIGIN = "http://localhost:5173"


@pytest.mark.unit
def test_middleware_execution_order():
    """Execution order (outermost -> innermost) must be:
    CORS -> RateLimit -> Auth -> Logging -> SecurityHeaders.

    Starlette stores user_middleware with the last-added entry first, which is
    also the outermost (first to execute) at runtime.
    """
    classes = [m.cls for m in app.user_middleware]
    assert classes == [
        CORSMiddleware,
        RateLimitMiddleware,
        AuthenticationMiddleware,
        GatewayLoggingMiddleware,
        SecurityHeadersMiddleware,
    ]


@pytest.mark.unit
def test_rate_limit_runs_before_auth():
    """Rate limiting must wrap (run before) authentication."""
    classes = [m.cls for m in app.user_middleware]
    assert classes.index(RateLimitMiddleware) < classes.index(AuthenticationMiddleware)


@pytest.mark.unit
def test_cors_is_outermost():
    """CORS must be the outermost middleware so its headers reach error responses."""
    assert app.user_middleware[0].cls is CORSMiddleware


@pytest.mark.unit
def test_cors_headers_on_401_error():
    """A 401 from auth middleware must still carry CORS headers."""
    client = TestClient(app)
    resp = client.get("/api/v1/recipes", headers={"Origin": ORIGIN})

    assert resp.status_code == 401
    assert resp.headers.get("access-control-allow-origin") == ORIGIN


@pytest.mark.unit
def test_preflight_options_succeeds_without_auth():
    """Preflight OPTIONS to a protected route must return 200 with CORS headers,
    not 401 from the auth middleware."""
    client = TestClient(app)
    resp = client.options(
        "/api/v1/recipes",
        headers={
            "Origin": ORIGIN,
            "Access-Control-Request-Method": "GET",
        },
    )

    assert resp.status_code == 200
    assert resp.headers.get("access-control-allow-origin") == ORIGIN


@pytest.mark.unit
def test_rate_limit_returns_429_response_not_exception():
    """When the limit is exceeded, the middleware returns a 429 Response with a
    Retry-After header and CORS headers, rather than raising an exception that
    would surface as a 500."""
    client = TestClient(app)

    # /api/v1/auth/login is a public route (no auth) with a strict 5/min limit.
    last = None
    for _ in range(7):
        last = client.post(
            "/api/v1/auth/login",
            json={},
            headers={"Origin": ORIGIN},
        )

    assert last is not None
    assert last.status_code == 429
    assert last.headers.get("retry-after") is not None
    assert last.headers.get("access-control-allow-origin") == ORIGIN
    assert last.json()["detail"] == "Too many requests. Please try again later."
