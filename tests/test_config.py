"""Tests for configuration loading and parsing."""

import pytest

from services.config import (
    Config,
    Dependency,
    Service,
    Vendor,
    get_config,
    get_config_for_service,
    get_config_for_service_dependency,
    get_config_for_vendor,
    load_model,
    parse_query_params,
)


@pytest.mark.unit
def test_load_model():
    """Test loading Pydantic models from string references."""
    from services.shared.schemas.generic import DeleteResponse

    # Test loading a simple model
    model = load_model("services.shared.schemas.generic.DeleteResponse")
    assert model == DeleteResponse

    # Test loading None
    assert load_model(None) is None


@pytest.mark.unit
def test_load_model_list():
    """Test loading List[Model] from string references."""

    from services.shared.schemas.recipe import RecipeOut

    # Test loading a list model
    model = load_model("services.shared.schemas.recipe.RecipeOut[]")
    assert model.__origin__ is list
    assert model.__args__[0] == RecipeOut


@pytest.mark.unit
def test_parse_query_params():
    """Test parsing query parameter configurations."""
    config_data = {
        "limit": {"type": "int", "default": 20, "ge": 1, "le": 100},
        "search": {"type": "str", "default": None},
    }

    params = parse_query_params(config_data)

    assert "limit" in params
    assert params["limit"].type == "int"
    assert params["limit"].default == 20
    assert params["limit"].ge == 1
    assert params["limit"].le == 100

    assert "search" in params
    assert params["search"].type == "str"
    assert params["search"].default is None


@pytest.mark.unit
def test_parse_query_params_empty():
    """Test parsing empty query parameters."""
    assert parse_query_params(None) == {}
    assert parse_query_params({}) == {}


@pytest.mark.unit
def test_get_config():
    """Test loading the full application config."""
    config = get_config()

    assert isinstance(config, Config)
    assert config.title == "MacMac"
    assert config.version == "0.2.1"
    assert config.urlPrefix == "/api/v1"
    assert "recipes" in config.services
    assert "catalog" in config.services
    assert "colruyt" in config.vendors


@pytest.mark.unit
def test_get_config_for_service():
    """Test retrieving a specific service configuration."""
    service = get_config_for_service("recipes")

    assert isinstance(service, Service)
    assert service.name == "recipes"
    assert service.title == "Recipes API"
    assert len(service.routes) > 0


@pytest.mark.unit
def test_get_config_for_service_not_found():
    """Test retrieving a non-existent service raises error."""
    with pytest.raises(ValueError, match="Service with name nonexistent not found"):
        get_config_for_service("nonexistent")


@pytest.mark.unit
def test_get_config_for_service_dependency():
    """Test retrieving a service dependency configuration."""
    dep = get_config_for_service_dependency("catalog", "crawler")

    assert isinstance(dep, Dependency)
    assert dep.name == "crawler"
    assert dep.title == "Crawler"


@pytest.mark.unit
def test_get_config_for_service_dependency_not_found():
    """Test retrieving a non-existent dependency raises error."""
    with pytest.raises(
        ValueError, match="Dependency with name nonexistent not found for service catalog"
    ):
        get_config_for_service_dependency("catalog", "nonexistent")


@pytest.mark.unit
def test_get_config_for_vendor():
    """Test retrieving a vendor configuration."""
    vendor = get_config_for_vendor("colruyt")

    assert isinstance(vendor, Vendor)
    assert vendor.name == "Colruyt Collect & Go"
    assert vendor.url == "https://www.collectandgo.be/sitemap.xml"


@pytest.mark.unit
def test_get_config_for_vendor_not_found():
    """Test retrieving a non-existent vendor raises error."""
    with pytest.raises(ValueError, match="Vendor with name nonexistent not found"):
        get_config_for_vendor("nonexistent")


@pytest.mark.unit
def test_service_routes():
    """Test that service routes are properly parsed."""
    service = get_config_for_service("recipes")

    # Find the create_recipe route
    create_route = next((r for r in service.routes if r.method == "post"), None)
    assert create_route is not None
    assert create_route.path == "/recipes"
    assert create_route.handler == "services.recipes.crud.create_recipe"
    assert "recipe" in create_route.tags


@pytest.mark.unit
def test_vendor_configuration():
    """Test vendor configuration structure."""
    vendor = get_config_for_vendor("colruyt")

    assert vendor.product_url_identifier == "/assortiment/"
    assert "collectandgo.be" in vendor.url


@pytest.mark.unit
def test_load_handler():
    """Test loading handler functions from string references."""
    from services.config import load_handler

    # Test loading a handler function
    handler = load_handler("services.recipes.crud.list_recipes")
    assert callable(handler)
    # Handler may be wrapped with decorators (traced)
    # Just verify it's a function that was loaded successfully
