"""Tests for framework components."""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from services.framework.app import create_microservice
from services.framework.helpers import resolve_handler


@pytest.mark.unit
def test_resolve_handler():
    """Test resolving handler functions from string references."""
    from services.recipes.crud import list_recipes

    handler = resolve_handler("services.recipes.crud.list_recipes")
    assert handler == list_recipes


@pytest.mark.unit
def test_resolve_handler_invalid():
    """Test resolving invalid handler raises AttributeError."""
    with pytest.raises(AttributeError):
        resolve_handler("services.recipes.crud.nonexistent_handler")


@pytest.mark.unit
def test_create_microservice():
    """Test creating a microservice from config."""

    def mock_get_db():
        return None

    app = create_microservice("recipes", mock_get_db)

    assert isinstance(app, FastAPI)
    assert app.title == "recipes service"
    assert app.version == "1.0"

    # Test client to verify routes
    client = TestClient(app)

    # Health check should be available
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.unit
def test_microservice_routes_registered():
    """Test that routes from config are registered in the microservice."""

    def mock_get_db():
        return None

    app = create_microservice("recipes", mock_get_db)

    # Get all routes
    routes = [route.path for route in app.routes]

    # Should have healthz
    assert "/healthz" in routes

    # Should have recipe routes (exact paths may vary)
    assert any("/recipes" in route for route in routes)


@pytest.mark.unit
def test_microservice_openapi_url():
    """Test that OpenAPI endpoint is properly configured."""

    def mock_get_db():
        return None

    app = create_microservice("recipes", mock_get_db)

    assert app.openapi_url == "/openapi.json"

    client = TestClient(app)
    response = client.get("/openapi.json")
    assert response.status_code == 200
    assert "openapi" in response.json()
