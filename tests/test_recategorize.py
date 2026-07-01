"""Tests for the one-off catalog re-categorization backfill."""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.catalog.models import CatalogItem


def _make_item(db, **overrides):
    defaults = {
        "vendor_name": "Colruyt Collect & Go",
        "vendor_product_id": overrides.get("raw_name", "test"),
        "raw_name": "test product",
        "product_url": f"https://example.com/{overrides.get('raw_name', 'test')}",
        "is_food": True,
        "category": "Leafy Greens",
        "last_enriched_at": datetime.now(UTC),
    }
    defaults.update(overrides)
    item = CatalogItem(**defaults)
    db.add(item)
    db.commit()
    return item


def _mock_openai(content):
    """Build a mock AsyncOpenAI whose completion returns ``content``.

    ``content`` may be a single string (used for every call) or a list consumed
    in call order.
    """
    responses = content if isinstance(content, list) else None

    def _response(text):
        resp = MagicMock()
        resp.choices = [MagicMock()]
        resp.choices[0].message.content = text
        return resp

    async def _create(*_args, **_kwargs):
        if responses is not None:
            return _response(responses.pop(0))
        return _response(content)

    client = MagicMock()
    client.chat.completions.create = AsyncMock(side_effect=_create)
    client.close = AsyncMock()
    return client


def _run_with(mock_catalog_db, client):
    """Run recategorize._run() with SessionLocal + the LLM client seam patched.

    Patching ``recategorize._make_client`` (not ``openai.AsyncOpenAI``) keeps the
    real ``openai`` package out of the test path, so these tests run in the CI
    ``test`` extra where openai is not installed.
    """
    from services.catalog.enricher import recategorize

    with (
        patch.object(recategorize, "SessionLocal", return_value=mock_catalog_db),
        patch.object(recategorize, "_make_client", return_value=client),
    ):
        return recategorize.main_run()


@pytest.mark.unit
def test_missing_api_key_exits_nonzero(mock_catalog_db, monkeypatch):
    import services.catalog.enricher.recategorize as recategorize

    monkeypatch.setattr(recategorize, "OPENAI_API_KEY", None)
    rc = recategorize.main_run()
    assert rc == 1


@pytest.mark.unit
def test_valid_category_updates_row(mock_catalog_db, monkeypatch):
    import services.catalog.enricher.recategorize as recategorize

    monkeypatch.setattr(recategorize, "OPENAI_API_KEY", "sk-test")
    enriched_at = datetime.now(UTC)
    item = _make_item(
        mock_catalog_db,
        raw_name="banana",
        category="Vegetables",
        last_enriched_at=enriched_at,
    )
    original_enriched = item.last_enriched_at

    rc = _run_with(mock_catalog_db, _mock_openai('{"category": "Fresh Fruit"}'))
    assert rc == 0

    mock_catalog_db.expire_all()
    row = mock_catalog_db.query(CatalogItem).filter_by(raw_name="banana").one()
    assert row.category == "Fresh Fruit"
    # last_enriched_at must be untouched by the backfill.
    assert row.last_enriched_at == original_enriched


@pytest.mark.unit
def test_out_of_taxonomy_output_skips_row(mock_catalog_db, monkeypatch):
    import services.catalog.enricher.recategorize as recategorize

    monkeypatch.setattr(recategorize, "OPENAI_API_KEY", "sk-test")
    _make_item(mock_catalog_db, raw_name="mystery", category="Vegetables")

    rc = _run_with(mock_catalog_db, _mock_openai('{"category": "Not A Real Leaf"}'))
    assert rc == 0

    mock_catalog_db.expire_all()
    row = mock_catalog_db.query(CatalogItem).filter_by(raw_name="mystery").one()
    # Row NOT updated — stays in its original (wrong) leaf.
    assert row.category == "Vegetables"


@pytest.mark.unit
def test_dry_run_writes_nothing(mock_catalog_db, monkeypatch):
    import services.catalog.enricher.recategorize as recategorize

    monkeypatch.setattr(recategorize, "OPENAI_API_KEY", "sk-test")
    monkeypatch.setenv("RECATEGORIZE_DRY_RUN", "1")
    _make_item(mock_catalog_db, raw_name="apple", category="Vegetables")

    rc = _run_with(mock_catalog_db, _mock_openai('{"category": "Fresh Fruit"}'))
    assert rc == 0

    mock_catalog_db.expire_all()
    row = mock_catalog_db.query(CatalogItem).filter_by(raw_name="apple").one()
    # Dry run classifies + logs but must not write.
    assert row.category == "Vegetables"


@pytest.mark.unit
def test_max_items_cap_respected(mock_catalog_db, monkeypatch):
    import services.catalog.enricher.recategorize as recategorize

    monkeypatch.setattr(recategorize, "OPENAI_API_KEY", "sk-test")
    monkeypatch.setenv("RECATEGORIZE_MAX_ITEMS", "2")
    for i in range(5):
        _make_item(mock_catalog_db, raw_name=f"item-{i}", category="Vegetables")

    client = _mock_openai('{"category": "Fresh Fruit"}')
    rc = _run_with(mock_catalog_db, client)
    assert rc == 0

    # Only 2 items classified (cap), so only 2 LLM calls made.
    assert client.chat.completions.create.await_count == 2

    mock_catalog_db.expire_all()
    updated = mock_catalog_db.query(CatalogItem).filter_by(category="Fresh Fruit").count()
    assert updated == 2


@pytest.mark.unit
def test_bare_category_response_is_parsed(mock_catalog_db, monkeypatch):
    import services.catalog.enricher.recategorize as recategorize

    monkeypatch.setattr(recategorize, "OPENAI_API_KEY", "sk-test")
    _make_item(mock_catalog_db, raw_name="bread", category="Vegetables")

    # Non-JSON bare label is still accepted when it is a valid leaf.
    rc = _run_with(mock_catalog_db, _mock_openai("Bread"))
    assert rc == 0

    mock_catalog_db.expire_all()
    row = mock_catalog_db.query(CatalogItem).filter_by(raw_name="bread").one()
    assert row.category == "Bread"


@pytest.mark.unit
def test_empty_response_skips_row(mock_catalog_db, monkeypatch):
    import services.catalog.enricher.recategorize as recategorize

    monkeypatch.setattr(recategorize, "OPENAI_API_KEY", "sk-test")
    _make_item(mock_catalog_db, raw_name="empty", category="Vegetables")

    rc = _run_with(mock_catalog_db, _mock_openai(None))
    assert rc == 0

    mock_catalog_db.expire_all()
    row = mock_catalog_db.query(CatalogItem).filter_by(raw_name="empty").one()
    assert row.category == "Vegetables"


@pytest.mark.unit
def test_non_food_item_rejects_food_leaf(mock_catalog_db, monkeypatch):
    # A non-food row is only offered Household leaves; a FOOD-leaf reply is
    # out-of-scope and must NOT update the row (counted skipped_invalid).
    import services.catalog.enricher.recategorize as recategorize

    monkeypatch.setattr(recategorize, "OPENAI_API_KEY", "sk-test")
    _make_item(
        mock_catalog_db,
        raw_name="after-sun body milk",
        is_food=False,
        category="Personal Care",
    )

    rc = _run_with(mock_catalog_db, _mock_openai('{"category": "Milk & Cream"}'))
    assert rc == 0

    mock_catalog_db.expire_all()
    row = mock_catalog_db.query(CatalogItem).filter_by(raw_name="after-sun body milk").one()
    # Non-food item stays put — never moved into a food department.
    assert row.category == "Personal Care"


@pytest.mark.unit
def test_non_food_item_updates_within_scope(mock_catalog_db, monkeypatch):
    # A within-scope Household reply updates the non-food row.
    import services.catalog.enricher.recategorize as recategorize

    monkeypatch.setattr(recategorize, "OPENAI_API_KEY", "sk-test")
    _make_item(
        mock_catalog_db,
        raw_name="dish soap",
        is_food=False,
        category="Personal Care",
    )

    rc = _run_with(mock_catalog_db, _mock_openai('{"category": "Cleaning & Laundry"}'))
    assert rc == 0

    mock_catalog_db.expire_all()
    row = mock_catalog_db.query(CatalogItem).filter_by(raw_name="dish soap").one()
    assert row.category == "Cleaning & Laundry"


@pytest.mark.unit
def test_food_item_rejects_household_leaf(mock_catalog_db, monkeypatch):
    # A food row is only offered food leaves; a Household reply is rejected.
    import services.catalog.enricher.recategorize as recategorize

    monkeypatch.setattr(recategorize, "OPENAI_API_KEY", "sk-test")
    _make_item(
        mock_catalog_db,
        raw_name="cooking oil",
        is_food=True,
        category="Oils & Vinegars",
    )

    rc = _run_with(mock_catalog_db, _mock_openai('{"category": "Baby & Pet"}'))
    assert rc == 0

    mock_catalog_db.expire_all()
    row = mock_catalog_db.query(CatalogItem).filter_by(raw_name="cooking oil").one()
    # Food item stays put — never moved into the non-food department.
    assert row.category == "Oils & Vinegars"


# ===== Parser + env helpers (no DB / no network) =====


@pytest.mark.unit
def test_parse_category_accepts_json_object():
    from services.catalog.enricher.recategorize import _parse_category
    from services.shared.lib.catalog_taxonomy import FOOD_CATEGORIES

    allowed = set(FOOD_CATEGORIES)
    assert _parse_category('{"category": "Cheese"}', allowed) == "Cheese"


@pytest.mark.unit
def test_parse_category_rejects_invalid_leaf():
    from services.catalog.enricher.recategorize import _parse_category
    from services.shared.lib.catalog_taxonomy import FOOD_CATEGORIES

    allowed = set(FOOD_CATEGORIES)
    assert _parse_category('{"category": "Bogus"}', allowed) is None
    assert _parse_category("Bogus", allowed) is None
    assert _parse_category("", allowed) is None
    assert _parse_category(None, allowed) is None


@pytest.mark.unit
def test_parse_category_scope_aware():
    # A leaf valid in the taxonomy but outside the item's scope is rejected.
    from services.catalog.enricher.recategorize import _parse_category
    from services.shared.lib.catalog_taxonomy import (
        FOOD_CATEGORIES,
        NON_FOOD_CATEGORIES,
    )

    food = set(FOOD_CATEGORIES)
    non_food = set(NON_FOOD_CATEGORIES)
    # Household leaf offered to a food item -> rejected; accepted for non-food.
    assert _parse_category('{"category": "Personal Care"}', food) is None
    assert _parse_category('{"category": "Personal Care"}', non_food) == "Personal Care"
    # Food leaf offered to a non-food item -> rejected; accepted for food.
    assert _parse_category('{"category": "Milk & Cream"}', non_food) is None
    assert _parse_category('{"category": "Milk & Cream"}', food) == "Milk & Cream"


@pytest.mark.unit
def test_dry_run_env_parsing(monkeypatch):
    from services.catalog.enricher.recategorize import _is_dry_run

    monkeypatch.delenv("RECATEGORIZE_DRY_RUN", raising=False)
    assert _is_dry_run() is False
    for truthy in ("1", "true", "TRUE", "yes", "on"):
        monkeypatch.setenv("RECATEGORIZE_DRY_RUN", truthy)
        assert _is_dry_run() is True
    monkeypatch.setenv("RECATEGORIZE_DRY_RUN", "0")
    assert _is_dry_run() is False


@pytest.mark.unit
def test_max_items_env_parsing(monkeypatch):
    from services.catalog.enricher.recategorize import _get_max_items

    monkeypatch.delenv("RECATEGORIZE_MAX_ITEMS", raising=False)
    assert _get_max_items() is None
    monkeypatch.setenv("RECATEGORIZE_MAX_ITEMS", "42")
    assert _get_max_items() == 42
