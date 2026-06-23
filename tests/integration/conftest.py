"""Shared fixtures for HTTP-level integration tests.

These tests mount the real FastAPI app for each service via ``TestClient`` and
exercise the full request path: routing -> ``auth_tracing_middleware`` (real JWT
verification) -> ``build_query_dependency()`` -> CRUD handler -> PostgreSQL.

This is the layer unit tests skip: unit tests call CRUD functions directly and
mock the user context, so they cannot catch bugs at the framework<->handler
boundary (e.g. a query param declared in ``config.yaml`` but silently dropped by
``build_query_dependency()``).

Environment variables MUST be set before importing any service code:
``services/shared/lib/jwt.py`` reads ``JWT_SECRET_KEY`` at import time and exits
the process if it is missing outside development.
"""

import os

# IMPORTANT: set env vars BEFORE importing any service code.
os.environ["JWT_SECRET_KEY"] = "integration-test-secret-minimum-32chars!"
os.environ["ENVIRONMENT"] = "testing"  # triggers NullPool in db_pool.py
os.environ["TESTING"] = "1"

# Per-service test databases (created on the dev Postgres containers).
# Ports match podman-compose-dev.yaml: recipes=5432, catalog=5433, meal_plans=5434.
os.environ["RECIPES_DATABASE_URL"] = "postgresql+pg8000://dbuser:dbpass@localhost:5432/recipes_test"
os.environ["CATALOG_DATABASE_URL"] = "postgresql+pg8000://dbuser:dbpass@localhost:5433/catalog_test"
os.environ["MEAL_PLANS_DATABASE_URL"] = (
    "postgresql+pg8000://dbuser:dbpass@localhost:5434/meal_plans_test"
)

import asyncio  # noqa: E402
import uuid  # noqa: E402
from datetime import UTC, datetime, timedelta  # noqa: E402
from unittest.mock import AsyncMock, MagicMock, patch  # noqa: E402

import jwt as pyjwt  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

_JWT_SECRET = os.environ["JWT_SECRET_KEY"]


# ── JWT helpers ──────────────────────────────────────────────────────────────


def mint_token(user_id: str, group_ids: list[str] | None = None) -> str:
    """Mint a real HS256 JWT the way the auth service does.

    The claims must match what ``decode_access_token()`` requires: ``sub``,
    ``username``, ``iat``/``exp``, issuer ``macmac-auth`` and audience
    ``macmac-api``. A unique ``jti`` avoids any collision with the revocation
    list.
    """
    return pyjwt.encode(
        {
            "sub": user_id,
            "username": f"test-{user_id[:8]}",
            "groups": group_ids or [],
            "iss": "macmac-auth",
            "aud": "macmac-api",
            "iat": datetime.now(UTC),
            "exp": datetime.now(UTC) + timedelta(hours=1),
            "jti": str(uuid.uuid4()),
        },
        _JWT_SECRET,
        algorithm="HS256",
    )


@pytest.fixture(scope="session")
def user_a_id() -> str:
    return str(uuid.uuid4())


@pytest.fixture(scope="session")
def user_b_id() -> str:
    return str(uuid.uuid4())


@pytest.fixture(scope="session")
def auth_headers_a(user_a_id) -> dict[str, str]:
    return {"Authorization": f"Bearer {mint_token(user_a_id)}"}


@pytest.fixture(scope="session")
def auth_headers_b(user_b_id) -> dict[str, str]:
    return {"Authorization": f"Bearer {mint_token(user_b_id)}"}


def run_async(coro):
    """Run a coroutine to completion for seeding via async CRUD functions.

    Seeding happens outside the request loop, so a dedicated short-lived loop is
    created per call rather than relying on the implicit (deprecated) one.
    """
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def set_test_user(user_id: str, group_ids: list[str] | None = None) -> None:
    """Set the user context used while seeding data directly via CRUD calls.

    Seeding bypasses the HTTP path, so the contextvar the CRUD layer reads via
    ``require_user_context()`` must be populated explicitly.
    """
    from services.framework.user_context import set_user_context

    set_user_context(
        user_id=uuid.UUID(user_id),
        username=f"test-{user_id[:8]}",
        group_ids=[uuid.UUID(g) for g in (group_ids or [])],
    )


# ── Cross-service + cache mocks (autouse) ────────────────────────────────────


@pytest.fixture(autouse=True)
def disable_redis_cache():
    """Replace the per-service Redis caches with no-ops.

    Integration tests target framework<->handler correctness, not cache
    behaviour, and Redis is not part of the integration test environment. Cache
    correctness is covered by ``tests/test_cache_serialization.py``.
    """
    noop = MagicMock()
    noop.get.return_value = None
    noop.get_json.return_value = None
    noop.set_json.return_value = None
    noop.delete.return_value = None
    noop.delete_pattern.return_value = 0
    with (
        patch("services.catalog.crud.cache", noop),
        patch("services.recipes.crud.cache", noop),
        patch("services.meal_plans.crud.cache", noop),
    ):
        yield


@pytest.fixture(autouse=True)
def mock_cross_service_http():
    """Mock cross-service HTTP calls so each service is tested in isolation.

    recipes -> catalog (validate/fetch catalog items) and meal_plans -> recipes
    (fetch recipe titles) are network calls in production; here they return
    deterministic stand-ins so the tests exercise only the service under test.
    """

    async def mock_validate(catalog_item_ids):
        return {cid: f"Item {str(cid)[:8]}" for cid in catalog_item_ids}

    async def mock_batch_fetch(catalog_item_ids):
        return {
            str(cid): {
                "canonical_name": f"Item {str(cid)[:8]}",
                "raw_name": f"Raw {str(cid)[:8]}",
            }
            for cid in catalog_item_ids
        }

    with (
        patch("services.recipes.crud.validate_catalog_items", new=mock_validate),
        patch("services.recipes.crud.batch_fetch_catalog_items", new=mock_batch_fetch),
        patch(
            "services.meal_plans.crud.fetch_recipe_titles",
            new=AsyncMock(return_value={}),
        ),
    ):
        yield


# ── RECIPES ──────────────────────────────────────────────────────────────────


@pytest.fixture(scope="session")
def recipes_engine():
    from services.recipes.models import Base

    engine = create_engine(os.environ["RECIPES_DATABASE_URL"])
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture()
def recipes_db(recipes_engine):
    """Transactional isolation: each test runs in a transaction rolled back at teardown."""
    conn = recipes_engine.connect()
    trans = conn.begin()
    db = sessionmaker(bind=conn)()
    yield db
    db.close()
    trans.rollback()
    conn.close()


@pytest.fixture()
def recipes_client(recipes_db):
    from services.recipes.main import app
    from services.recipes.main import recipes_db as get_recipes_db

    app.dependency_overrides[get_recipes_db] = lambda: recipes_db
    with TestClient(app, raise_server_exceptions=True) as client:
        yield client
    app.dependency_overrides.clear()


# ── CATALOG ──────────────────────────────────────────────────────────────────


@pytest.fixture(scope="session")
def catalog_engine():
    from services.catalog.models import Base

    engine = create_engine(os.environ["CATALOG_DATABASE_URL"])
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture()
def catalog_db(catalog_engine):
    conn = catalog_engine.connect()
    trans = conn.begin()
    db = sessionmaker(bind=conn)()
    yield db
    db.close()
    trans.rollback()
    conn.close()


@pytest.fixture()
def catalog_client(catalog_db):
    from services.catalog.main import app
    from services.catalog.main import catalog_db as get_catalog_db

    app.dependency_overrides[get_catalog_db] = lambda: catalog_db
    with TestClient(app, raise_server_exceptions=True) as client:
        yield client
    app.dependency_overrides.clear()


# ── MEAL PLANS ───────────────────────────────────────────────────────────────


@pytest.fixture(scope="session")
def meal_plans_engine():
    from services.meal_plans.models import Base

    engine = create_engine(os.environ["MEAL_PLANS_DATABASE_URL"])
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture()
def meal_plans_db(meal_plans_engine):
    conn = meal_plans_engine.connect()
    trans = conn.begin()
    db = sessionmaker(bind=conn)()
    yield db
    db.close()
    trans.rollback()
    conn.close()


@pytest.fixture()
def meal_plans_client(meal_plans_db):
    from services.meal_plans.main import app
    from services.meal_plans.main import meal_plans_db as get_meal_plans_db

    app.dependency_overrides[get_meal_plans_db] = lambda: meal_plans_db
    with TestClient(app, raise_server_exceptions=True) as client:
        yield client
    app.dependency_overrides.clear()
