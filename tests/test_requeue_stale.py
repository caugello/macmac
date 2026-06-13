"""Tests for catalog re-enrichment cron job."""

from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest

from services.catalog.models import CatalogItem


def _make_item(db, **overrides):
    defaults = {
        "vendor_name": "Colruyt Collect & Go",
        "vendor_product_id": overrides.get("raw_name", "test"),
        "raw_name": "test product",
        "product_url": f"https://example.com/{overrides.get('raw_name', 'test')}",
        "is_food": True,
        "last_enriched_at": datetime.now(UTC),
    }
    defaults.update(overrides)
    item = CatalogItem(**defaults)
    db.add(item)
    db.commit()
    return item


@pytest.mark.unit
def test_backfill_null_image(mock_catalog_db):
    from services.catalog.enricher.requeue_stale import find_items_to_requeue

    _make_item(
        mock_catalog_db, raw_name="no-image", image_url=None, nutrition={"cal": 100}, nutriscore="A"
    )
    _make_item(
        mock_catalog_db,
        raw_name="complete",
        image_url="http://img.jpg",
        nutrition={"cal": 100},
        nutriscore="A",
    )

    items = find_items_to_requeue(mock_catalog_db)
    assert len(items) == 1
    assert items[0]["raw_name"] == "no-image"


@pytest.mark.unit
def test_backfill_null_nutrition(mock_catalog_db):
    from services.catalog.enricher.requeue_stale import find_items_to_requeue

    _make_item(mock_catalog_db, raw_name="no-nutrition", image_url="http://img.jpg", nutriscore="A")

    items = find_items_to_requeue(mock_catalog_db)
    assert len(items) == 1
    assert items[0]["raw_name"] == "no-nutrition"


@pytest.mark.unit
def test_backfill_null_nutriscore(mock_catalog_db):
    from services.catalog.enricher.requeue_stale import find_items_to_requeue

    _make_item(
        mock_catalog_db,
        raw_name="no-score",
        image_url="http://img.jpg",
        nutrition={"cal": 100},
        nutriscore=None,
    )

    items = find_items_to_requeue(mock_catalog_db)
    assert len(items) == 1
    assert items[0]["raw_name"] == "no-score"


@pytest.mark.unit
def test_stale_items_requeued(mock_catalog_db):
    from services.catalog.enricher.requeue_stale import find_items_to_requeue

    _make_item(
        mock_catalog_db,
        raw_name="stale",
        image_url="http://img.jpg",
        nutrition={"cal": 100},
        nutriscore="A",
        last_enriched_at=datetime.now(UTC) - timedelta(days=5),
    )

    items = find_items_to_requeue(mock_catalog_db)
    assert len(items) == 1
    assert items[0]["raw_name"] == "stale"


@pytest.mark.unit
def test_fresh_complete_items_skipped(mock_catalog_db):
    from services.catalog.enricher.requeue_stale import find_items_to_requeue

    _make_item(
        mock_catalog_db,
        raw_name="fresh",
        image_url="http://img.jpg",
        nutrition={"cal": 100},
        nutriscore="A",
        last_enriched_at=datetime.now(UTC) - timedelta(hours=1),
    )

    items = find_items_to_requeue(mock_catalog_db)
    assert len(items) == 0


@pytest.mark.unit
def test_message_format(mock_catalog_db):
    from services.catalog.enricher.requeue_stale import find_items_to_requeue

    _make_item(
        mock_catalog_db, raw_name="test-item", image_url=None, nutriscore="A", nutrition={"cal": 1}
    )

    items = find_items_to_requeue(mock_catalog_db)
    assert len(items) == 1
    assert set(items[0].keys()) == {"vendor_name", "vendor_product_id", "raw_name", "product_url"}


@pytest.mark.unit
def test_no_items_returns_empty(mock_catalog_db):
    from services.catalog.enricher.requeue_stale import find_items_to_requeue

    items = find_items_to_requeue(mock_catalog_db)
    assert items == []


@pytest.mark.unit
def test_main_publishes_to_queue(mock_catalog_db):
    from services.catalog.enricher.requeue_stale import main

    _make_item(
        mock_catalog_db,
        raw_name="needs-enrichment",
        image_url=None,
        nutriscore="B",
        nutrition={"cal": 1},
    )

    mock_bus = MagicMock()
    with (
        patch("services.catalog.enricher.requeue_stale.SessionLocal", return_value=mock_catalog_db),
        patch("services.catalog.enricher.requeue_stale.MessagingBus", return_value=mock_bus),
        patch(
            "services.catalog.enricher.requeue_stale.get_config_for_service_dependency"
        ) as mock_config,
    ):
        mock_config.return_value = MagicMock(url="amqp://localhost")
        main()

    mock_bus.declare_queue.assert_called_once()
    assert mock_bus.publish.call_count == 1
    payload = mock_bus.publish.call_args[0][1]
    assert payload["raw_name"] == "needs-enrichment"


@pytest.mark.unit
def test_main_skips_when_no_items(mock_catalog_db):
    from services.catalog.enricher.requeue_stale import main

    mock_bus = MagicMock()
    with (
        patch("services.catalog.enricher.requeue_stale.SessionLocal", return_value=mock_catalog_db),
        patch(
            "services.catalog.enricher.requeue_stale.MessagingBus", return_value=mock_bus
        ) as bus_cls,
        patch(
            "services.catalog.enricher.requeue_stale.get_config_for_service_dependency"
        ) as mock_config,
    ):
        mock_config.return_value = MagicMock(url="amqp://localhost")
        main()

    bus_cls.assert_not_called()
