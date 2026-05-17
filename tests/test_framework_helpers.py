"""Tests for framework helper functions."""

from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import Request

from services.config import Route
from services.framework.helpers import (
    _run,
    build_body_handler,
    build_query_handler,
    make_endpoint,
    resolve_handler,
)


@pytest.mark.unit
def test_resolve_handler():
    """Test resolving handler functions from string paths."""
    handler = resolve_handler("services.recipes.crud.list_recipes")
    assert callable(handler)
    # Handler may be wrapped with decorators (traced)
    # Just verify it's a function that was loaded successfully


@pytest.mark.unit
def test_resolve_handler_invalid():
    """Test resolving invalid handler raises error."""
    with pytest.raises((AttributeError, ModuleNotFoundError)):
        resolve_handler("services.invalid.module.nonexistent")


@pytest.mark.asyncio
@pytest.mark.unit
async def test_run_with_data_and_db():
    """Test _run helper with data and db."""
    handler = AsyncMock(return_value={"result": "success"})
    handler.__name__ = "test_handler"

    request = MagicMock(spec=Request)
    request.path_params = {}

    result = await _run(handler, request, {"data": "test"}, "db_session", None)

    handler.assert_called_once_with({"data": "test"}, "db_session")
    assert result == {"result": "success"}


@pytest.mark.asyncio
@pytest.mark.unit
async def test_run_with_path_params():
    """Test _run helper with path parameters."""
    handler = AsyncMock(return_value={"id": "123"})
    handler.__name__ = "test_handler"

    request = MagicMock(spec=Request)
    request.path_params = {"item_id": "123", "user_id": "456"}

    result = await _run(handler, request, None, "db_session", None)

    handler.assert_called_once_with("123", "456", "db_session")
    assert result == {"id": "123"}


@pytest.mark.asyncio
@pytest.mark.unit
async def test_run_with_query_params():
    """Test _run helper with query parameters."""
    handler = AsyncMock(return_value={"items": []})
    handler.__name__ = "list_handler"

    request = MagicMock(spec=Request)
    request.path_params = {}

    qp = {"limit": 10, "offset": 0}
    result = await _run(handler, request, None, "db_session", qp)

    handler.assert_called_once_with("db_session", limit=10, offset=0)
    assert result == {"items": []}


@pytest.mark.asyncio
@pytest.mark.unit
async def test_run_sync_handler():
    """Test _run helper with synchronous handler."""

    def sync_handler(db):
        return {"sync": True}

    sync_handler.__name__ = "sync_test"

    request = MagicMock(spec=Request)
    request.path_params = {}

    result = await _run(sync_handler, request, None, "db_session", None)

    assert result == {"sync": True}


@pytest.mark.unit
def test_build_body_handler():
    """Test building a body handler."""
    from pydantic import BaseModel

    class TestModel(BaseModel):
        name: str

    handler = MagicMock(return_value={"created": True})
    get_db = MagicMock()

    endpoint = build_body_handler(TestModel, handler, get_db)

    assert callable(endpoint)


@pytest.mark.unit
def test_build_query_handler():
    """Test building a query handler."""
    handler = AsyncMock(return_value={"items": []})
    handler.__name__ = "list_handler"
    get_db = MagicMock()

    endpoint = build_query_handler(handler, get_db, None)

    assert callable(endpoint)


@pytest.mark.unit
def test_make_endpoint_with_request_model():
    """Test making endpoint with request model."""
    from pydantic import BaseModel

    class TestModel(BaseModel):
        name: str

    route = MagicMock(spec=Route)
    route.request_model = TestModel
    route.path = "/items"
    route.query_params = {}

    handler = MagicMock()
    get_db = MagicMock()

    endpoint = make_endpoint(route, handler, get_db)

    assert callable(endpoint)


@pytest.mark.unit
def test_make_endpoint_without_request_model():
    """Test making endpoint without request model."""
    route = MagicMock(spec=Route)
    route.request_model = None
    route.path = "/items"
    route.query_params = {}

    handler = AsyncMock()
    handler.__name__ = "test"
    get_db = MagicMock()

    endpoint = make_endpoint(route, handler, get_db)

    assert callable(endpoint)


@pytest.mark.unit
def test_make_endpoint_with_path_params():
    """Test making endpoint with path parameters."""
    route = MagicMock(spec=Route)
    route.request_model = None
    route.path = "/items/{item_id}"
    route.query_params = {}

    handler = AsyncMock()
    handler.__name__ = "get_item"
    get_db = MagicMock()

    endpoint = make_endpoint(route, handler, get_db)

    assert callable(endpoint)


@pytest.mark.asyncio
@pytest.mark.unit
async def test_build_body_handler_execution():
    """Test executing a body handler endpoint."""
    from pydantic import BaseModel

    class TestModel(BaseModel):
        name: str

    # Create a mock handler that accepts data and db
    def mock_handler(data, db):
        return {"created": data.name, "db": db}

    def get_db():
        return "db_session"

    endpoint = build_body_handler(TestModel, mock_handler, get_db)

    # Create a mock request
    request = MagicMock(spec=Request)
    request.path_params = {}

    # Call endpoint with test data
    result = await endpoint(data=TestModel(name="test"), request=request, db="db_session")

    assert result == {"created": "test", "db": "db_session"}


@pytest.mark.asyncio
@pytest.mark.unit
async def test_build_body_handler_with_path_params():
    """Test body handler with path parameters."""
    from pydantic import BaseModel

    class TestModel(BaseModel):
        name: str

    # Handler that expects path params and data
    def mock_handler(item_id, data, db):
        return {"id": item_id, "name": data.name}

    def get_db():
        return "db_session"

    endpoint = build_body_handler(TestModel, mock_handler, get_db)

    # Create request with path params
    request = MagicMock(spec=Request)
    request.path_params = {"item_id": "123"}

    result = await endpoint(data=TestModel(name="test"), request=request, db="db_session")

    assert result == {"id": "123", "name": "test"}


@pytest.mark.asyncio
@pytest.mark.unit
async def test_build_body_handler_async():
    """Test body handler with async handler function."""
    from pydantic import BaseModel

    class TestModel(BaseModel):
        name: str

    # Async handler that accepts data and db
    async def async_handler(data, db):
        return {"created": data.name}

    def get_db():
        return "db_session"

    endpoint = build_body_handler(TestModel, async_handler, get_db)

    request = MagicMock(spec=Request)
    request.path_params = {}

    result = await endpoint(data=TestModel(name="test"), request=request, db="db_session")

    assert result == {"created": "test"}
