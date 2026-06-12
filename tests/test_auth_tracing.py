"""Tests for backend JWT verification in auth_tracing middleware.

Covers issue #169: backends must verify the JWT independently instead of
trusting X-User-* headers forwarded by the gateway.
"""

import os

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing-min-32-chars")
os.environ.setdefault("ENVIRONMENT", "development")

from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from services.auth.security import create_access_token  # noqa: E402
from services.framework.auth_tracing import auth_tracing_middleware  # noqa: E402
from services.framework.user_context import current_token, get_user_context  # noqa: E402


def _build_app():
    """Minimal FastAPI app with only the auth_tracing middleware."""
    app = FastAPI()

    @app.middleware("http")
    async def middleware(request, call_next):
        return await auth_tracing_middleware(request, call_next)

    @app.get("/test")
    def test_endpoint():
        ctx = get_user_context()
        if ctx is None:
            return {"user": None, "token": None}
        return {
            "user_id": str(ctx.user_id),
            "username": ctx.username,
            "groups": [str(g) for g in ctx.group_ids],
            "token": current_token.get(),
        }

    return app


@pytest.fixture()
def client():
    return TestClient(_build_app())


@pytest.fixture()
def user_id():
    return str(uuid4())


@pytest.fixture()
def group_id():
    return str(uuid4())


@pytest.fixture()
def valid_token(user_id, group_id):
    return create_access_token(user_id, "testuser", [group_id])


@pytest.mark.unit
class TestAuthTracingJWT:
    def test_valid_jwt_sets_user_context(self, client, valid_token, user_id, group_id):
        resp = client.get("/test", headers={"Authorization": f"Bearer {valid_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["user_id"] == user_id
        assert data["username"] == "testuser"
        assert data["groups"] == [group_id]

    def test_missing_auth_header_no_context(self, client):
        resp = client.get("/test")
        assert resp.status_code == 200
        assert resp.json()["user"] is None

    def test_invalid_token_no_context(self, client):
        resp = client.get("/test", headers={"Authorization": "Bearer garbage.token.here"})
        assert resp.status_code == 200
        assert resp.json()["user"] is None

    def test_forged_x_user_headers_without_jwt_rejected(self, client):
        resp = client.get(
            "/test",
            headers={
                "X-User-ID": str(uuid4()),
                "X-Username": "attacker",
                "X-User-Groups": str(uuid4()),
            },
        )
        assert resp.status_code == 200
        assert resp.json()["user"] is None

    def test_forged_x_user_headers_ignored_when_jwt_present(self, client, valid_token, user_id):
        """Even if X-User-* headers are present, the JWT payload wins."""
        resp = client.get(
            "/test",
            headers={
                "Authorization": f"Bearer {valid_token}",
                "X-User-ID": str(uuid4()),
                "X-Username": "attacker",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["user_id"] == user_id
        assert data["username"] == "testuser"

    def test_no_groups_in_token(self, client):
        token = create_access_token(str(uuid4()), "nogroups", [])
        resp = client.get("/test", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["groups"] == []
        assert data["username"] == "nogroups"

    def test_malformed_bearer_prefix_no_context(self, client):
        resp = client.get("/test", headers={"Authorization": "Basic abc123"})
        assert resp.status_code == 200
        assert resp.json()["user"] is None

    def test_valid_jwt_stores_raw_token(self, client, valid_token, user_id):
        resp = client.get("/test", headers={"Authorization": f"Bearer {valid_token}"})
        assert resp.status_code == 200
        assert resp.json()["token"] == valid_token

    def test_missing_auth_header_no_token(self, client):
        resp = client.get("/test")
        assert resp.status_code == 200
        assert resp.json()["token"] is None

    def test_invalid_token_no_token_stored(self, client):
        resp = client.get("/test", headers={"Authorization": "Bearer garbage.token.here"})
        assert resp.status_code == 200
        assert resp.json()["token"] is None
