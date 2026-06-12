"""Tests for framework utility functions."""

from unittest.mock import MagicMock

import pytest

from services.framework.utils import build_query_dependency, import_from_string


@pytest.mark.unit
def test_import_from_string():
    """Test importing classes from string paths."""
    from services.shared.schemas.recipe import RecipeCreate

    cls = import_from_string("services.shared.schemas.recipe.RecipeCreate")
    assert cls == RecipeCreate


@pytest.mark.unit
def test_import_from_string_invalid():
    """Test importing invalid path raises error."""
    with pytest.raises((AttributeError, ModuleNotFoundError)):
        import_from_string("services.invalid.module.Class")


@pytest.mark.unit
def test_build_query_dependency():
    """Test building query dependency function."""
    route = MagicMock()
    route.query_params = {"limit": {}, "offset": {}, "search": {}}

    query_dep = build_query_dependency(route)

    assert callable(query_dep)

    result = query_dep(limit=20, offset=10, search="test")
    assert result["limit"] == 20
    assert result["offset"] == 10
    assert result["search"] == "test"
    assert "category" not in result


@pytest.mark.unit
def test_build_query_dependency_defaults():
    """Test query dependency with default values."""
    route = MagicMock()
    route.query_params = {"limit": {}, "offset": {}}

    query_dep = build_query_dependency(route)

    result = query_dep(limit=None, offset=0, search=None)
    assert result["limit"] == 100  # Default limit
    assert result["offset"] == 0
    assert "search" not in result


@pytest.mark.unit
def test_build_query_dependency_with_category():
    """Test query dependency includes category only when declared."""
    route = MagicMock()
    route.query_params = {"limit": {}, "offset": {}, "search": {}, "category": {}}

    query_dep = build_query_dependency(route)

    result = query_dep(limit=20, offset=0, search=None, category="Dairy & Eggs")
    assert result["category"] == "Dairy & Eggs"
    assert result["limit"] == 20


@pytest.mark.unit
def test_build_query_dependency_with_ingredient():
    """Test query dependency includes ingredient only when declared."""
    route = MagicMock()
    route.query_params = {"limit": {}, "offset": {}, "ingredient": {}}

    query_dep = build_query_dependency(route)

    result = query_dep(limit=20, offset=0, ingredient="catalog-item-123")
    assert result["ingredient"] == "catalog-item-123"
    assert result["limit"] == 20


@pytest.mark.unit
def test_build_query_dependency_ingredient_excluded_when_not_declared():
    """Test ingredient is dropped when route does not declare it."""
    route = MagicMock()
    route.query_params = {"limit": {}, "offset": {}}

    query_dep = build_query_dependency(route)

    result = query_dep(limit=20, offset=0, ingredient="catalog-item-123")
    assert "ingredient" not in result


@pytest.mark.unit
def test_build_query_dependency_no_query_params():
    """Test building dependency when route has no query_params."""
    route = MagicMock()
    route.query_params = {}

    query_dep = build_query_dependency(route)

    assert callable(query_dep)

    result = query_dep(limit=50, offset=5, search="query")
    assert result == {}


@pytest.mark.unit
def test_build_query_dependency_clamps_excessive_limit():
    """Test query dependency clamps an excessive limit to MAX_LIMIT."""
    route = MagicMock()
    route.query_params = {"limit": {}, "offset": {}}

    query_dep = build_query_dependency(route)

    result = query_dep(limit=999999999, offset=0)
    assert result["limit"] == 1000


@pytest.mark.unit
def test_build_query_dependency_clamps_excessive_offset():
    """Test query dependency clamps an excessive offset to MAX_OFFSET."""
    route = MagicMock()
    route.query_params = {"limit": {}, "offset": {}}

    query_dep = build_query_dependency(route)

    result = query_dep(limit=None, offset=999999999)
    assert result["offset"] == 100000


@pytest.mark.unit
def test_build_query_dependency_zero_limit_uses_default():
    """Test query dependency uses DEFAULT_LIMIT when limit is zero."""
    route = MagicMock()
    route.query_params = {"limit": {}, "offset": {}}

    query_dep = build_query_dependency(route)

    result = query_dep(limit=0, offset=0)
    assert result["limit"] == 100
