"""Tests for the computed unit price on CatalogItemOut."""

import uuid
from datetime import UTC, datetime

import pytest

from services.shared.schemas.catalog import CatalogItemOut


def _build_item(**overrides) -> CatalogItemOut:
    base = {
        "id": uuid.uuid4(),
        "vendor_name": "test_vendor",
        "vendor_product_id": "test-product",
        "raw_name": "Test Product",
        "product_url": "https://example.com/p",
        "is_food": True,
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
    }
    base.update(overrides)
    return CatalogItemOut(**base)


@pytest.mark.unit
def test_unit_price_grams_normalized_to_kg():
    """Grams are reported per kilogram."""
    item = _build_item(price=2.0, net_quantity_value=500.0, net_quantity_unit="g")
    assert item.unit_price == 4.0
    assert item.unit_price_unit == "kg"


@pytest.mark.unit
def test_unit_price_millilitres_normalized_to_litre():
    """Millilitres are reported per litre."""
    item = _build_item(price=1.5, net_quantity_value=250.0, net_quantity_unit="ml")
    assert item.unit_price == 6.0
    assert item.unit_price_unit == "l"


@pytest.mark.unit
def test_unit_price_per_piece():
    """Non weight/volume units are reported per the item's own unit."""
    item = _build_item(price=5.0, net_quantity_value=4.0, net_quantity_unit="pc")
    assert item.unit_price == 1.25
    assert item.unit_price_unit == "pc"


@pytest.mark.unit
def test_unit_price_rounded_to_cents():
    """The ratio is rounded to two decimals."""
    item = _build_item(price=1.0, net_quantity_value=3.0, net_quantity_unit="pc")
    assert item.unit_price == 0.33
    assert item.unit_price_unit == "pc"


@pytest.mark.unit
def test_unit_price_null_when_price_missing():
    """No price means no unit price."""
    item = _build_item(price=None, net_quantity_value=500.0, net_quantity_unit="g")
    assert item.unit_price is None
    assert item.unit_price_unit is None


@pytest.mark.unit
def test_unit_price_null_when_quantity_missing():
    """No quantity means no unit price."""
    item = _build_item(price=2.0, net_quantity_value=None, net_quantity_unit="g")
    assert item.unit_price is None
    assert item.unit_price_unit is None


@pytest.mark.unit
def test_unit_price_null_when_quantity_zero():
    """A zero or negative quantity can't yield a unit price."""
    item = _build_item(price=2.0, net_quantity_value=0.0, net_quantity_unit="g")
    assert item.unit_price is None
    assert item.unit_price_unit is None
