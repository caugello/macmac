"""Tests for catalog enricher functionality."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.catalog.enricher.main import (
    PermanentCrawlError,
    async_retry,
    extract_quantity_from_url,
    normalize_unit,
)
from services.shared.schemas.catalog import CatalogItemCreate

# ===== UNIT TESTS - normalize_unit =====


@pytest.mark.unit
def test_normalize_unit_grams():
    """Test normalizing gram units."""
    assert normalize_unit("g") == "g"
    assert normalize_unit("gr") == "g"
    assert normalize_unit("gram") == "g"
    assert normalize_unit("grams") == "g"
    assert normalize_unit("G") == "g"
    assert normalize_unit("GR") == "g"


@pytest.mark.unit
def test_normalize_unit_kilograms():
    """Test normalizing kilogram units."""
    assert normalize_unit("kg") == "kg"
    assert normalize_unit("KG") == "kg"
    assert normalize_unit("kilo") == "kg"
    assert normalize_unit("kilogram") == "kg"


@pytest.mark.unit
def test_normalize_unit_volume():
    """Test normalizing volume units."""
    assert normalize_unit("ml") == "ml"
    assert normalize_unit("ML") == "ml"
    assert normalize_unit("milliliter") == "ml"
    assert normalize_unit("milliliters") == "ml"
    assert normalize_unit("l") == "l"
    assert normalize_unit("L") == "l"
    assert normalize_unit("liter") == "l"
    assert normalize_unit("liters") == "l"


@pytest.mark.unit
def test_normalize_unit_pieces():
    """Test normalizing piece units."""
    assert normalize_unit("pc") == "pc"
    assert normalize_unit("piece") == "pc"
    assert normalize_unit("pieces") == "pc"
    assert normalize_unit("pcs") == "pc"
    assert normalize_unit("stuks") == "pc"
    assert normalize_unit("stuk") == "pc"
    assert normalize_unit("st") == "pc"


@pytest.mark.unit
def test_normalize_unit_spoons():
    """Test normalizing spoon units."""
    assert normalize_unit("tsp") == "tsp"
    assert normalize_unit("teaspoon") == "tsp"
    assert normalize_unit("teaspoons") == "tsp"
    assert normalize_unit("tbsp") == "tbsp"
    assert normalize_unit("tablespoon") == "tbsp"
    assert normalize_unit("tablespoons") == "tbsp"


@pytest.mark.unit
def test_normalize_unit_special():
    """Test normalizing special units."""
    assert normalize_unit("pinch") == "pinch"
    assert normalize_unit("dash") == "dash"


@pytest.mark.unit
def test_normalize_unit_invalid():
    """Test that invalid units return None."""
    assert normalize_unit("invalid") is None
    assert normalize_unit("oz") is None
    assert normalize_unit("lbs") is None
    assert normalize_unit("") is None
    assert normalize_unit(None) is None


# ===== UNIT TESTS - extract_quantity_from_url =====


@pytest.mark.unit
def test_extract_quantity_from_url_grams():
    """Test extracting grams from URL."""
    url = "https://www.collectandgo.be/nl/assortiment/boni-zonnebloempitten-280g"
    qty, unit = extract_quantity_from_url(url)
    assert qty == 280.0
    assert unit == "g"


@pytest.mark.unit
def test_extract_quantity_from_url_kilograms():
    """Test extracting kilograms from URL."""
    url = "https://www.collectandgo.be/nl/assortiment/soubry-pasta-spaghetti-1kg"
    qty, unit = extract_quantity_from_url(url)
    assert qty == 1.0
    assert unit == "kg"


@pytest.mark.unit
def test_extract_quantity_from_url_liters():
    """Test extracting liters from URL."""
    url = "https://www.collectandgo.be/nl/assortiment/milk-fresh-1l"
    qty, unit = extract_quantity_from_url(url)
    assert qty == 1.0
    assert unit == "l"


@pytest.mark.unit
def test_extract_quantity_from_url_milliliters():
    """Test extracting milliliters from URL."""
    url = "https://www.collectandgo.be/nl/assortiment/juice-orange-500ml"
    qty, unit = extract_quantity_from_url(url)
    assert qty == 500.0
    assert unit == "ml"


@pytest.mark.unit
def test_extract_quantity_from_url_centiliters():
    """Test extracting centiliters and converting to ml."""
    url = "https://www.collectandgo.be/nl/assortiment/drink-cola-33cl"
    qty, unit = extract_quantity_from_url(url)
    assert qty == 330.0  # 33cl = 330ml
    assert unit == "ml"


@pytest.mark.unit
def test_extract_quantity_from_url_decimal():
    """Test extracting decimal quantities."""
    url = "https://www.collectandgo.be/nl/assortiment/water-sparkling-1.5l"
    qty, unit = extract_quantity_from_url(url)
    assert qty == 1.5
    assert unit == "l"


@pytest.mark.unit
def test_extract_quantity_from_url_comma_decimal():
    """Test extracting quantities with comma as decimal separator."""
    url = "https://www.collectandgo.be/nl/assortiment/product-1,5kg"
    qty, unit = extract_quantity_from_url(url)
    assert qty == 1.5
    assert unit == "kg"


@pytest.mark.unit
def test_extract_quantity_from_url_no_match():
    """Test URL without quantity returns None."""
    url = "https://www.collectandgo.be/nl/assortiment/product-name-only"
    qty, unit = extract_quantity_from_url(url)
    assert qty is None
    assert unit is None


@pytest.mark.unit
def test_extract_quantity_from_url_with_trailing_text():
    """Test URL with quantity followed by other text."""
    url = "https://www.collectandgo.be/nl/assortiment/pasta-500g-bio"
    qty, unit = extract_quantity_from_url(url)
    assert qty == 500.0
    assert unit == "g"


@pytest.mark.unit
def test_extract_quantity_from_url_magret():
    """Test extracting from the magret de canard example."""
    url = "https://www.collectandgo.be/nl/assortiment/boni-selection-magret-de-canard-fume-80g"
    qty, unit = extract_quantity_from_url(url)
    assert qty == 80.0
    assert unit == "g"


# ===== UNIT TESTS - async_retry =====


@pytest.mark.unit
@pytest.mark.asyncio
async def test_async_retry_succeeds_first_try():
    func = AsyncMock(return_value="ok")
    result = await async_retry(func, max_retries=3, backoff=0.01)
    assert result == "ok"
    assert func.call_count == 1


@pytest.mark.unit
@pytest.mark.asyncio
async def test_async_retry_succeeds_after_transient_failure():
    func = AsyncMock(side_effect=[RuntimeError("timeout"), "ok"])
    result = await async_retry(
        func, max_retries=3, backoff=0.01, retryable_exceptions=(RuntimeError,)
    )
    assert result == "ok"
    assert func.call_count == 2


@pytest.mark.unit
@pytest.mark.asyncio
async def test_async_retry_exhausts_retries():
    func = AsyncMock(side_effect=RuntimeError("always fails"))
    with pytest.raises(RuntimeError, match="always fails"):
        await async_retry(func, max_retries=3, backoff=0.01, retryable_exceptions=(RuntimeError,))
    assert func.call_count == 3


@pytest.mark.unit
@pytest.mark.asyncio
async def test_async_retry_does_not_retry_non_retryable():
    func = AsyncMock(side_effect=PermanentCrawlError("404"))
    with pytest.raises(PermanentCrawlError):
        await async_retry(
            func,
            max_retries=3,
            backoff=0.01,
            retryable_exceptions=(RuntimeError,),
            non_retryable_exceptions=(PermanentCrawlError,),
        )
    assert func.call_count == 1


# ===== UNIT TESTS - write_to_db exception handling =====


@pytest.mark.unit
def test_write_to_db_propagates_unexpected_errors():
    from services.catalog.enricher.main import write_to_db

    payload = {
        "raw_name": "Test Product",
        "vendor_name": "test",
        "product_url": "https://www.collectandgo.be/fr/assortiment/test-500g",
    }
    ch = MagicMock()

    mock_loop = MagicMock()
    mock_loop.run_until_complete.side_effect = ConnectionError("db down")

    with (
        patch("services.catalog.enricher.main.asyncio.new_event_loop", return_value=mock_loop),
        patch("services.catalog.enricher.main.asyncio.set_event_loop"),
    ):
        with pytest.raises(ConnectionError, match="db down"):
            write_to_db(payload, ch)


# ===== UNIT TESTS - upsert behavior =====


@pytest.mark.unit
def test_create_catalog_item_inserts_new(mock_catalog_db):
    from services.catalog.enricher.db import create_catalog_item

    data = CatalogItemCreate(
        vendor_name="colruyt",
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
    from services.catalog.enricher.db import create_catalog_item

    data = CatalogItemCreate(
        vendor_name="colruyt",
        raw_name="Pasta 500g",
        product_url="https://example.com/pasta-500g",
        is_food=True,
        price=1.89,
        category="Pasta & Rice",
    )
    create_catalog_item(data, mock_catalog_db)

    updated = CatalogItemCreate(
        vendor_name="colruyt",
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
    from services.catalog.enricher.db import create_catalog_item

    data = CatalogItemCreate(
        vendor_name="colruyt",
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
        raw_name="Pasta 500g",
        product_url="https://example.com/pasta-500g",
        is_food=True,
        price=2.19,
    )
    result = create_catalog_item(partial, mock_catalog_db)
    assert result.price == 2.19
    assert result.category == "Pasta & Rice"
    assert result.nutriscore == "B"
