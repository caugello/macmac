"""Pytest configuration and fixtures for MacMac tests."""

import os
import uuid
from collections.abc import Generator
from unittest.mock import MagicMock, patch

import pytest
from pydantic import UUID4
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

# Set test environment
os.environ["TESTING"] = "1"


@pytest.fixture
def mock_db() -> Generator[Session, None, None]:
    """Create an in-memory SQLite database for testing."""
    from services.recipes.models import Base as RecipesBase

    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    RecipesBase.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        RecipesBase.metadata.drop_all(bind=engine)


@pytest.fixture
def mock_catalog_db() -> Generator[Session, None, None]:
    """Create an in-memory SQLite database for catalog testing."""
    from services.catalog.models import Base as CatalogBase

    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    CatalogBase.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        CatalogBase.metadata.drop_all(bind=engine)


@pytest.fixture
def mock_rabbitmq_channel():
    """Mock RabbitMQ channel for testing."""
    channel = MagicMock()
    channel.basic_publish = MagicMock()
    channel.basic_consume = MagicMock()
    channel.queue_declare = MagicMock()
    return channel


@pytest.fixture
def mock_config(tmp_path):
    """Create a temporary config.yaml for testing."""
    config_content = """---
urlPrefix: /api/v1
title: MacMac Test
version: 0.1.0
tmpDir: /tmp

vendors:
  test_vendor:
    url: "https://example.com/sitemap.xml"
    name: Test Vendor
    product_url_identifier: "/products/"

services:
  recipes:
    name: recipes
    title: Recipes API
    version: 0.1.0
    url: "http://0.0.0.0:8001"
    db: "sqlite:///:memory:"
    routes:
      - name: list_recipes
        method: get
        path: /recipes
        response_model: services.shared.schemas.recipe.RecipeListResponse
        handler: services.recipes.crud.list_recipes
        description: List recipes
        tags: [recipe]
"""
    config_file = tmp_path / "config.yaml"
    config_file.write_text(config_content)
    return str(config_file)


@pytest.fixture(autouse=True)
def mock_user_context():
    """Mock user context for all tests requiring authentication."""
    from services.framework.user_context import set_user_context

    # Create test user context with valid UUID4 values
    test_user_id = uuid.uuid4()
    test_group_id = uuid.uuid4()

    set_user_context(user_id=test_user_id, username="testuser", group_ids=[test_group_id])
    yield
    # Cleanup happens automatically when context var goes out of scope


@pytest.fixture
def mock_meal_plans_db() -> Generator[Session, None, None]:
    """Create an in-memory SQLite database for meal plans testing."""
    from services.meal_plans.models import Base as MealPlansBase

    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    MealPlansBase.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        MealPlansBase.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def mock_meal_plans_http_calls():
    """Mock HTTP calls in meal_plans.crud to avoid real requests."""

    async def mock_validate(recipe_id):
        return f"Test Recipe {str(recipe_id)[:8]}"

    async def mock_fetch_titles(recipe_ids):
        return {rid: f"Test Recipe {str(rid)[:8]}" for rid in recipe_ids}

    with (
        patch("services.meal_plans.crud.validate_recipe_exists", new=mock_validate),
        patch("services.meal_plans.crud.fetch_recipe_titles", new=mock_fetch_titles),
    ):
        yield


@pytest.fixture(autouse=True)
def mock_catalog_http_calls():
    """Mock catalog HTTP calls to avoid real HTTP requests in unit tests."""

    async def mock_validate(catalog_item_ids: list[UUID4]) -> dict[UUID4, str]:
        return {item_id: f"Test Item {str(item_id)[:8]}" for item_id in catalog_item_ids}

    async def mock_batch_fetch(catalog_item_ids: list[UUID4]) -> dict[str, dict]:
        return {
            str(item_id): {
                "canonical_name": f"Test Item {str(item_id)[:8]}",
                "raw_name": f"Raw Item {str(item_id)[:8]}",
            }
            for item_id in catalog_item_ids
        }

    with (
        patch("services.recipes.crud.validate_catalog_items", new=mock_validate),
        patch("services.recipes.crud.batch_fetch_catalog_items", new=mock_batch_fetch),
    ):
        yield
