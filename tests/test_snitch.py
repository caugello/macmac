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
