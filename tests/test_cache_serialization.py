"""Unit tests for cache JSON serialization of UUID/datetime/date types."""

import json
from datetime import date, datetime
from unittest.mock import MagicMock
from uuid import UUID

import pytest
from pydantic import BaseModel

from services.shared.lib.cache import CacheConfig, RedisCache, _json_default


class _SampleModel(BaseModel):
    name: str


@pytest.mark.unit
def test_json_default_serializes_uuid():
    value = UUID("12345678-1234-5678-1234-567812345678")
    assert _json_default(value) == "12345678-1234-5678-1234-567812345678"


@pytest.mark.unit
def test_json_default_serializes_datetime():
    value = datetime(2026, 6, 11, 14, 30, 0)
    assert _json_default(value) == "2026-06-11T14:30:00"


@pytest.mark.unit
def test_json_default_serializes_date():
    value = date(2026, 6, 11)
    assert _json_default(value) == "2026-06-11"


@pytest.mark.unit
def test_json_default_serializes_pydantic_model():
    assert _json_default(_SampleModel(name="x")) == {"name": "x"}


@pytest.mark.unit
def test_json_default_raises_for_unsupported_type():
    with pytest.raises(TypeError, match="not JSON serializable"):
        _json_default(object())


@pytest.mark.unit
def test_json_dumps_with_mixed_types():
    """json.dumps with _json_default handles a recipes/catalog-like row."""
    payload = [
        {
            "id": UUID("12345678-1234-5678-1234-567812345678"),
            "created_at": datetime(2026, 6, 11, 14, 30, 0),
            "available_on": date(2026, 6, 11),
        }
    ]
    encoded = json.dumps(payload, default=_json_default)
    decoded = json.loads(encoded)
    assert decoded == [
        {
            "id": "12345678-1234-5678-1234-567812345678",
            "created_at": "2026-06-11T14:30:00",
            "available_on": "2026-06-11",
        }
    ]


def _cache_with_mock_client():
    cache = RedisCache(CacheConfig())
    cache._client = MagicMock()
    cache._client.setex.return_value = True
    cache._client.set.return_value = True
    return cache


@pytest.mark.unit
def test_set_json_caches_uuid_value():
    """UUID-containing values serialize and reach Redis (issue #214: recipes list)."""
    cache = _cache_with_mock_client()
    value = {"id": UUID("12345678-1234-5678-1234-567812345678")}

    assert cache.set_json("recipes:list", value, ttl=300) is True

    stored = cache._client.setex.call_args.args[2]
    assert json.loads(stored) == {"id": "12345678-1234-5678-1234-567812345678"}


@pytest.mark.unit
def test_set_json_caches_datetime_value():
    """datetime-containing values serialize and reach Redis (issue #214: catalog list)."""
    cache = _cache_with_mock_client()
    value = {"created_at": datetime(2026, 6, 11, 14, 30, 0)}

    assert cache.set_json("catalog:list", value, ttl=300) is True

    stored = cache._client.setex.call_args.args[2]
    assert json.loads(stored) == {"created_at": "2026-06-11T14:30:00"}


@pytest.mark.unit
def test_set_json_caches_date_value():
    cache = _cache_with_mock_client()
    value = {"available_on": date(2026, 6, 11)}

    assert cache.set_json("catalog:list", value, ttl=300) is True

    stored = cache._client.setex.call_args.args[2]
    assert json.loads(stored) == {"available_on": "2026-06-11"}
