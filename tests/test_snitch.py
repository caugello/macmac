"""Tests for catalog snitch (enrichment-results consumer)."""

from contextlib import contextmanager
from unittest.mock import MagicMock, patch

import pytest
from pydantic import ValidationError

from services.catalog.snitch.main import persist_result
from services.shared.schemas.catalog import CatalogItemCreate


def _enriched_dict(**overrides):
    item = CatalogItemCreate(
        vendor_name="colruyt",
        vendor_product_id="pasta-500g",
        raw_name="Pasta 500g",
        product_url="https://www.collectandgo.be/fr/assortiment/pasta-500g",
        canonical_name="Pasta",
        brand="Barilla",
        net_quantity_value=500.0,
        net_quantity_unit="g",
        is_food=True,
        price=1.89,
        currency="EUR",
        category="Pasta",
        nutrition={"energy_kcal": 350},
        image_url="https://example.com/pasta.jpg",
    )
    data = item.model_dump(mode="json")
    data.update(overrides)
    return data


def _message(enriched=None, **overrides):
    payload = {
        "vendor_name": "colruyt",
        "vendor_product_id": "pasta-500g",
        "raw_name": "Pasta 500g",
        "product_url": "https://www.collectandgo.be/fr/assortiment/pasta-500g",
        "enriched": enriched if enriched is not None else _enriched_dict(),
    }
    payload.update(overrides)
    return payload


def _fake_get_db(mock_db):
    """Return a callable that yields ``mock_db`` for each ``get_db(...)`` call."""

    @contextmanager
    def _cm(_session_local):
        yield mock_db

    return _cm


# ===== UNIT TESTS - happy-path write =====


@pytest.mark.unit
def test_persist_result_writes_when_not_fresh():
    """A non-fresh item is reconstructed and written via create_catalog_item."""
    mock_db = MagicMock()
    ch = MagicMock()

    stored = MagicMock()
    stored.canonical_name = "Pasta"
    stored.raw_name = "Pasta 500g"
    stored.net_quantity_value = 500.0
    stored.net_quantity_unit = "g"
    stored.price = 1.89
    stored.category = "Pasta"
    stored.nutrition = {"energy_kcal": 350}

    with (
        patch("services.catalog.snitch.main.get_db", new=_fake_get_db(mock_db)),
        patch("services.catalog.snitch.main.is_item_fresh", return_value=False),
        patch(
            "services.catalog.snitch.main.create_catalog_item", return_value=stored
        ) as mock_create,
    ):
        persist_result(_message(), ch)

    mock_create.assert_called_once()
    created_arg = mock_create.call_args.args[0]
    assert isinstance(created_arg, CatalogItemCreate)
    assert created_arg.vendor_name == "colruyt"
    assert created_arg.vendor_product_id == "pasta-500g"
    assert created_arg.brand == "Barilla"
    assert created_arg.nutrition == {"energy_kcal": 350}


# ===== UNIT TESTS - freshness skip =====


@pytest.mark.unit
def test_persist_result_skips_fresh_item():
    """A fresh item is not written to the database."""
    mock_db = MagicMock()
    ch = MagicMock()

    with (
        patch("services.catalog.snitch.main.get_db", new=_fake_get_db(mock_db)),
        patch("services.catalog.snitch.main.is_item_fresh", return_value=True) as mock_fresh,
        patch("services.catalog.snitch.main.create_catalog_item") as mock_create,
    ):
        persist_result(_message(), ch)

    mock_fresh.assert_called_once()
    mock_create.assert_not_called()


@pytest.mark.unit
def test_persist_result_freshness_uses_top_level_identifiers():
    """Freshness is checked with the message's top-level vendor identifiers."""
    mock_db = MagicMock()
    ch = MagicMock()

    with (
        patch("services.catalog.snitch.main.get_db", new=_fake_get_db(mock_db)),
        patch("services.catalog.snitch.main.is_item_fresh", return_value=True) as mock_fresh,
        patch("services.catalog.snitch.main.create_catalog_item"),
        patch("services.catalog.snitch.main.FRESHNESS_THRESHOLD_DAYS", 14),
    ):
        persist_result(_message(), ch)

    vendor_name, vendor_product_id, freshness_days, db = mock_fresh.call_args.args
    assert vendor_name == "colruyt"
    assert vendor_product_id == "pasta-500g"
    assert freshness_days == 14
    assert db is mock_db


# ===== UNIT TESTS - failed deserialization =====


@pytest.mark.unit
def test_persist_result_raises_on_bad_enriched_dict():
    """A malformed enriched block raises so the bus can DLQ the message."""
    mock_db = MagicMock()
    ch = MagicMock()

    bad = _message(enriched={"vendor_name": "colruyt"})  # missing required fields

    with (
        patch("services.catalog.snitch.main.get_db", new=_fake_get_db(mock_db)),
        patch("services.catalog.snitch.main.is_item_fresh", return_value=False),
        patch("services.catalog.snitch.main.create_catalog_item") as mock_create,
    ):
        with pytest.raises(ValidationError):
            persist_result(bad, ch)

    mock_create.assert_not_called()


# ===== UNIT TESTS - malformed message =====


@pytest.mark.unit
def test_persist_result_raises_on_missing_keys():
    """A message missing top-level keys raises rather than writing partial data."""
    ch = MagicMock()

    with (
        patch("services.catalog.snitch.main.is_item_fresh") as mock_fresh,
        patch("services.catalog.snitch.main.create_catalog_item") as mock_create,
    ):
        with pytest.raises(KeyError):
            persist_result({"raw_name": "Orphan"}, ch)

    mock_fresh.assert_not_called()
    mock_create.assert_not_called()


# ===== UNIT TESTS - upsert behavior =====


@pytest.mark.unit
def test_create_catalog_item_inserts_new(mock_catalog_db):
    from services.catalog.snitch.db import create_catalog_item

    data = CatalogItemCreate(
        vendor_name="colruyt",
        vendor_product_id="pasta-500g",
        raw_name="Pasta 500g",
        product_url="https://example.com/pasta-500g",
        is_food=True,
        price=1.89,
    )
    result = create_catalog_item(data, mock_catalog_db)
    assert result.product_url == "https://example.com/pasta-500g"
    assert result.price == 1.89


@pytest.mark.unit
def test_create_catalog_item_updates_existing_fields(mock_catalog_db):
    from services.catalog.snitch.db import create_catalog_item

    data = CatalogItemCreate(
        vendor_name="colruyt",
        vendor_product_id="pasta-500g",
        raw_name="Pasta 500g",
        product_url="https://example.com/pasta-500g",
        is_food=True,
        price=1.89,
        category="Pasta & Rice",
    )
    create_catalog_item(data, mock_catalog_db)

    updated = CatalogItemCreate(
        vendor_name="colruyt",
        vendor_product_id="pasta-500g",
        raw_name="Pasta 500g",
        product_url="https://example.com/pasta-500g",
        is_food=True,
        price=2.19,
        category="Pasta & Rice",
    )
    result = create_catalog_item(updated, mock_catalog_db)
    assert result.price == 2.19


@pytest.mark.unit
def test_create_catalog_item_does_not_overwrite_with_null(mock_catalog_db):
    from services.catalog.snitch.db import create_catalog_item

    data = CatalogItemCreate(
        vendor_name="colruyt",
        vendor_product_id="pasta-500g",
        raw_name="Pasta 500g",
        product_url="https://example.com/pasta-500g",
        is_food=True,
        price=1.89,
        category="Pasta & Rice",
        nutriscore="B",
    )
    create_catalog_item(data, mock_catalog_db)

    partial = CatalogItemCreate(
        vendor_name="colruyt",
        vendor_product_id="pasta-500g",
        raw_name="Pasta 500g",
        product_url="https://example.com/pasta-500g",
        is_food=True,
        price=2.19,
    )
    result = create_catalog_item(partial, mock_catalog_db)
    assert result.price == 2.19
    assert result.category == "Pasta & Rice"
    assert result.nutriscore == "B"


# ===== UNIT TESTS - non-food products are stored =====


@pytest.mark.unit
def test_create_catalog_item_stores_non_food(mock_catalog_db):
    """Non-food products must be stored (not silently dropped)."""
    from services.catalog.snitch.db import create_catalog_item

    data = CatalogItemCreate(
        vendor_name="colruyt",
        vendor_product_id="sponge-3pc",
        raw_name="Sponge Cleaning Pad 3pc",
        product_url="https://example.com/sponge-3pc",
        is_food=False,
        price=2.49,
        category="Household",
    )
    result = create_catalog_item(data, mock_catalog_db)
    assert result.product_url == "https://example.com/sponge-3pc"
    assert result.is_food is False
    assert result.category == "Household"


# ===== UNIT TESTS - is_item_fresh / incremental crawl =====


@pytest.mark.unit
def test_is_item_fresh_returns_false_for_missing_item(mock_catalog_db):
    from services.catalog.snitch.db import is_item_fresh

    assert is_item_fresh("colruyt", "nonexistent-123", 14, mock_catalog_db) is False


@pytest.mark.unit
def test_is_item_fresh_returns_false_for_stale_item(mock_catalog_db):
    from datetime import UTC, datetime, timedelta

    from services.catalog.models import CatalogItem
    from services.catalog.snitch.db import is_item_fresh

    item = CatalogItem(
        vendor_name="colruyt",
        vendor_product_id="pasta-500g",
        raw_name="Pasta 500g",
        product_url="https://example.com/pasta-500g",
        is_food=True,
        price=1.89,
        nutrition={"energy_kcal": 350},
        image_url="https://example.com/pasta.jpg",
        last_enriched_at=datetime.now(UTC) - timedelta(days=20),
    )
    mock_catalog_db.add(item)
    mock_catalog_db.commit()

    assert is_item_fresh("colruyt", "pasta-500g", 14, mock_catalog_db) is False


@pytest.mark.unit
def test_is_item_fresh_returns_true_for_complete_food_item(mock_catalog_db):
    from datetime import UTC, datetime, timedelta

    from services.catalog.models import CatalogItem
    from services.catalog.snitch.db import is_item_fresh

    item = CatalogItem(
        vendor_name="colruyt",
        vendor_product_id="pasta-500g",
        raw_name="Pasta 500g",
        product_url="https://example.com/pasta-500g",
        is_food=True,
        price=1.89,
        nutrition={"energy_kcal": 350},
        image_url="https://example.com/pasta.jpg",
        last_enriched_at=datetime.now(UTC) - timedelta(days=5),
    )
    mock_catalog_db.add(item)
    mock_catalog_db.commit()

    assert is_item_fresh("colruyt", "pasta-500g", 14, mock_catalog_db) is True


@pytest.mark.unit
def test_is_item_fresh_returns_false_for_food_missing_nutrition(mock_catalog_db):
    from datetime import UTC, datetime, timedelta

    from services.catalog.models import CatalogItem
    from services.catalog.snitch.db import is_item_fresh

    item = CatalogItem(
        vendor_name="colruyt",
        vendor_product_id="pasta-500g",
        raw_name="Pasta 500g",
        product_url="https://example.com/pasta-500g",
        is_food=True,
        price=1.89,
        nutrition=None,
        image_url="https://example.com/pasta.jpg",
        last_enriched_at=datetime.now(UTC) - timedelta(days=2),
    )
    mock_catalog_db.add(item)
    mock_catalog_db.commit()

    assert is_item_fresh("colruyt", "pasta-500g", 14, mock_catalog_db) is False


@pytest.mark.unit
def test_is_item_fresh_returns_true_for_complete_non_food_item(mock_catalog_db):
    from datetime import UTC, datetime, timedelta

    from services.catalog.models import CatalogItem
    from services.catalog.snitch.db import is_item_fresh

    item = CatalogItem(
        vendor_name="colruyt",
        vendor_product_id="sponge-3pc",
        raw_name="Sponge 3pc",
        product_url="https://example.com/sponge-3pc",
        is_food=False,
        price=2.49,
        image_url="https://example.com/sponge.jpg",
        last_enriched_at=datetime.now(UTC) - timedelta(days=5),
    )
    mock_catalog_db.add(item)
    mock_catalog_db.commit()

    assert is_item_fresh("colruyt", "sponge-3pc", 14, mock_catalog_db) is True
