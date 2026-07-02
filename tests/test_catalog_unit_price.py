"""Tests for the derived/stored unit price on CatalogItemOut."""

import uuid
from datetime import UTC, datetime

import pytest

from services.shared.schemas.catalog import CatalogItemOut, unit_price_conflicts
from services.shared.schemas.generic import UnitEnum


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


@pytest.mark.unit
def test_stored_unit_price_wins_over_derivation():
    """A scraped ground-truth unit price is kept, not overwritten by derivation."""
    item = _build_item(
        price=2.0,
        net_quantity_value=500.0,
        net_quantity_unit="g",
        unit_price=8.5,
        unit_price_unit="kg",
    )
    assert item.unit_price == 8.5
    assert item.unit_price_unit == "kg"


@pytest.mark.unit
def test_stored_unit_price_survives_without_price_or_quantity():
    """Variable-weight goods keep their €/kg with no pack price or quantity."""
    item = _build_item(
        price=None,
        net_quantity_value=None,
        unit_price=8.5,
        unit_price_unit="kg",
    )
    assert item.unit_price == 8.5
    assert item.unit_price_unit == "kg"


@pytest.mark.unit
def test_unit_price_conflicts_flags_gross_mismatch():
    """A €8.50/kg ground truth contradicts an 8.50 price paired with 4.84 kg."""
    assert unit_price_conflicts(8.5, 4.84, UnitEnum.KILOGRAM, 8.5, "kg") is True


@pytest.mark.unit
def test_unit_price_conflicts_allows_consistent_pack():
    """A 500 g pack at €2.00 is consistent with a €4.00/kg unit price."""
    assert unit_price_conflicts(2.0, 500.0, UnitEnum.GRAM, 4.0, "kg") is False


@pytest.mark.unit
def test_unit_price_conflicts_false_without_ground_truth():
    """No scraped unit price means nothing to contradict."""
    assert unit_price_conflicts(8.5, 4.84, UnitEnum.KILOGRAM, None, None) is False


@pytest.mark.unit
def test_unit_price_conflicts_false_on_unit_mismatch():
    """Different reference units aren't comparable, so no conflict is asserted."""
    assert unit_price_conflicts(2.0, 4.0, UnitEnum.PIECE, 8.5, "kg") is False
