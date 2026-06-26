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
        last_enriched_at=datetime.now(UTC) - timedelta(days=20),
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


# --- Per-run budget: cap, prioritisation, env overrides ---


@pytest.mark.unit
def test_cap_respected(mock_catalog_db, monkeypatch):
    """More matching rows than the cap -> exactly cap rows queued."""
    from services.catalog.enricher.requeue_stale import find_items_to_requeue

    monkeypatch.setenv("REENRICH_MAX_ITEMS", "3")
    for i in range(10):
        _make_item(mock_catalog_db, raw_name=f"backfill-{i}", image_url=None)

    items = find_items_to_requeue(mock_catalog_db)
    assert len(items) == 3


@pytest.mark.unit
def test_backfill_before_refresh_ordering(mock_catalog_db, monkeypatch):
    """Backfill rows are queued before staleness-only refresh rows."""
    from services.catalog.enricher.requeue_stale import find_items_to_requeue

    monkeypatch.setenv("REENRICH_MAX_ITEMS", "0")
    # Stale-but-complete refresh row (older timestamp than the backfill row).
    _make_item(
        mock_catalog_db,
        raw_name="refresh",
        image_url="http://img.jpg",
        nutrition={"cal": 1},
        nutriscore="A",
        last_enriched_at=datetime.now(UTC) - timedelta(days=30),
    )
    # Backfill row with a fresher timestamp than the refresh row.
    _make_item(
        mock_catalog_db,
        raw_name="backfill",
        image_url=None,
        nutrition={"cal": 1},
        nutriscore="A",
        last_enriched_at=datetime.now(UTC) - timedelta(days=1),
    )

    items = find_items_to_requeue(mock_catalog_db)
    assert [i["raw_name"] for i in items] == ["backfill", "refresh"]


@pytest.mark.unit
def test_oldest_first_within_bucket(mock_catalog_db, monkeypatch):
    """Within a bucket, oldest last_enriched_at first (NULLs first)."""
    from services.catalog.enricher.requeue_stale import find_items_to_requeue

    monkeypatch.setenv("REENRICH_MAX_ITEMS", "0")
    _make_item(
        mock_catalog_db,
        raw_name="middle",
        image_url=None,
        last_enriched_at=datetime.now(UTC) - timedelta(days=5),
    )
    _make_item(
        mock_catalog_db,
        raw_name="oldest",
        image_url=None,
        last_enriched_at=datetime.now(UTC) - timedelta(days=20),
    )
    _make_item(
        mock_catalog_db,
        raw_name="never",
        image_url=None,
        last_enriched_at=None,
    )

    items = find_items_to_requeue(mock_catalog_db)
    assert [i["raw_name"] for i in items] == ["never", "oldest", "middle"]


@pytest.mark.unit
def test_stale_days_override_changes_matches(mock_catalog_db, monkeypatch):
    """REENRICH_STALE_DAYS override changes which rows match."""
    from services.catalog.enricher.requeue_stale import find_items_to_requeue

    _make_item(
        mock_catalog_db,
        raw_name="ten-days",
        image_url="http://img.jpg",
        nutrition={"cal": 1},
        nutriscore="A",
        last_enriched_at=datetime.now(UTC) - timedelta(days=10),
    )

    # Default threshold (14) -> a 10-day-old complete row is NOT stale.
    assert find_items_to_requeue(mock_catalog_db) == []

    # Tighter threshold (7) -> the 10-day-old row now matches.
    monkeypatch.setenv("REENRICH_STALE_DAYS", "7")
    items = find_items_to_requeue(mock_catalog_db)
    assert [i["raw_name"] for i in items] == ["ten-days"]


@pytest.mark.unit
def test_max_items_unset_uses_default(mock_catalog_db, monkeypatch):
    """REENRICH_MAX_ITEMS unset -> conservative default cap is used."""
    import services.catalog.enricher.requeue_stale as mod

    monkeypatch.delenv("REENRICH_MAX_ITEMS", raising=False)
    assert mod._get_max_items() == mod.DEFAULT_REENRICH_MAX_ITEMS


@pytest.mark.unit
def test_max_items_zero_disables_cap(mock_catalog_db, monkeypatch):
    """REENRICH_MAX_ITEMS <= 0 -> no cap, every matching row processed."""
    from services.catalog.enricher.requeue_stale import find_items_to_requeue

    monkeypatch.setenv("REENRICH_MAX_ITEMS", "0")
    for i in range(7):
        _make_item(mock_catalog_db, raw_name=f"item-{i}", image_url=None)

    items = find_items_to_requeue(mock_catalog_db)
    assert len(items) == 7


@pytest.mark.unit
def test_main_logs_total_vs_queued(mock_catalog_db, monkeypatch):
    """main() reports total matching vs queued (capped) counts."""
    from services.catalog.enricher import requeue_stale

    monkeypatch.setenv("REENRICH_MAX_ITEMS", "2")
    for i in range(5):
        _make_item(mock_catalog_db, raw_name=f"item-{i}", image_url=None)

    mock_bus = MagicMock()
    with (
        patch("services.catalog.enricher.requeue_stale.SessionLocal", return_value=mock_catalog_db),
        patch("services.catalog.enricher.requeue_stale.MessagingBus", return_value=mock_bus),
        patch(
            "services.catalog.enricher.requeue_stale.get_config_for_service_dependency"
        ) as mock_config,
        patch.object(requeue_stale.logger, "info") as mock_log,
    ):
        mock_config.return_value = MagicMock(url="amqp://localhost")
        requeue_stale.main()

    # Cap respected: only 2 of 5 matching rows published.
    assert mock_bus.publish.call_count == 2

    log_messages = [call.args[0] for call in mock_log.call_args_list]
    assert any(
        "Found 5 items needing re-enrichment, queued 2 (cap=2)" == msg for msg in log_messages
    )
