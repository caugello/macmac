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
    route.query_params = ["limit", "offset", "search"]

    query_dep = build_query_dependency(route)

    assert callable(query_dep)

    # Test calling the dependency
    result = query_dep(limit=20, offset=10, search="test")
    assert result["limit"] == 20
    assert result["offset"] == 10
    assert result["search"] == "test"


@pytest.mark.unit
def test_build_query_dependency_defaults():
    """Test query dependency with default values."""
    route = MagicMock()
    route.query_params = ["limit", "offset"]

    query_dep = build_query_dependency(route)

    # Test with defaults
    result = query_dep(limit=None, offset=0, search=None)
    assert result["limit"] == 100  # Default limit
    assert result["offset"] == 0
    assert result["search"] is None


@pytest.mark.unit
def test_build_query_dependency_no_query_params():
    """Test building dependency when route has no query_params attribute."""
    route = MagicMock(spec=[])  # Route without query_params attribute

    query_dep = build_query_dependency(route)

    assert callable(query_dep)

    # Should still work with default behavior
    result = query_dep(limit=50, offset=5, search="query")
    assert result["limit"] == 50
    assert result["offset"] == 5
