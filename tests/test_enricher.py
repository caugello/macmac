"""Tests for catalog enricher functionality."""

import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.catalog.enricher.main import (
    CircuitBreaker,
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
        "vendor_product_id": "test-500g",
        "product_url": "https://www.collectandgo.be/fr/assortiment/test-500g",
    }
    ch = MagicMock()

    mock_loop = MagicMock()
    mock_loop.run_until_complete.side_effect = ConnectionError("db down")

    with (
        patch("services.catalog.enricher.main.enrich_catalog_item", new=MagicMock()),
        patch("services.catalog.enricher.main.get_event_loop", return_value=mock_loop),
    ):
        with pytest.raises(ConnectionError, match="db down"):
            write_to_db(payload, ch)


@pytest.mark.unit
def test_write_to_db_skips_db_on_failed_crawl():
    """write_to_db must not call create_catalog_item when enrichment returns None."""
    from services.catalog.enricher.main import write_to_db

    payload = {
        "raw_name": "Blocked Product",
        "vendor_name": "colruyt",
        "vendor_product_id": "blocked-500g",
        "product_url": "https://www.collectandgo.be/fr/assortiment/blocked-500g",
    }
    ch = MagicMock()

    mock_loop = MagicMock()
    mock_loop.run_until_complete.return_value = None

    mock_create = MagicMock()

    with (
        patch("services.catalog.enricher.main.enrich_catalog_item", new=MagicMock()),
        patch("services.catalog.enricher.main.get_event_loop", return_value=mock_loop),
        patch("services.catalog.enricher.main.get_db") as mock_get_db,
        patch("services.catalog.enricher.main.create_catalog_item", mock_create),
    ):
        mock_get_session = MagicMock()
        mock_get_db.return_value.__enter__ = MagicMock(return_value=mock_get_session)
        mock_get_db.return_value.__exit__ = MagicMock(return_value=False)
        write_to_db(payload, ch)

    mock_create.assert_not_called()


# ===== UNIT TESTS - BrowserPool (shared browser reuse) =====


@pytest.mark.unit
@pytest.mark.asyncio
async def test_browser_pool_reuses_single_browser():
    """get_browser() launches once and reuses the same browser instance."""
    from services.catalog.enricher.main import BrowserPool

    pool = BrowserPool()

    mock_browser = MagicMock()
    mock_browser.is_connected.return_value = True
    mock_chromium = MagicMock()
    mock_chromium.launch = AsyncMock(return_value=mock_browser)
    mock_pw = MagicMock()
    mock_pw.chromium = mock_chromium

    mock_async_pw = MagicMock()
    mock_async_pw.start = AsyncMock(return_value=mock_pw)
    mock_async_pw_fn = MagicMock(return_value=mock_async_pw)
    fake_pw_module = MagicMock(async_playwright=mock_async_pw_fn)

    mock_context = MagicMock()

    async def _set_context(self=pool):
        self._context = mock_context

    with patch.dict(
        sys.modules,
        {
            "playwright": MagicMock(),
            "playwright.async_api": fake_pw_module,
        },
    ):
        with patch.object(pool, "_warm_session", side_effect=_set_context):
            first = await pool.get_context()
            second = await pool.get_context()
            third = await pool.get_context()

    assert first is mock_context
    assert second is mock_context
    assert third is mock_context
    assert mock_chromium.launch.await_count == 1
    assert mock_async_pw.start.await_count == 1


@pytest.mark.unit
@pytest.mark.asyncio
async def test_browser_pool_relaunches_on_disconnect():
    """A disconnected browser is relaunched so retries can recover."""
    from services.catalog.enricher.main import BrowserPool

    pool = BrowserPool()

    dead_browser = MagicMock()
    dead_browser.is_connected.return_value = False
    dead_browser.close = AsyncMock()

    fresh_browser = MagicMock()
    fresh_browser.is_connected.return_value = True

    mock_chromium = MagicMock()
    mock_chromium.launch = AsyncMock(side_effect=[dead_browser, fresh_browser])
    mock_pw = MagicMock()
    mock_pw.chromium = mock_chromium

    mock_async_pw = MagicMock()
    mock_async_pw.start = AsyncMock(return_value=mock_pw)
    mock_async_pw_fn = MagicMock(return_value=mock_async_pw)
    fake_pw_module = MagicMock(async_playwright=mock_async_pw_fn)

    mock_context_1 = MagicMock()
    mock_context_2 = MagicMock()
    contexts = iter([mock_context_1, mock_context_2])

    async def _set_context(self=pool):
        self._context = next(contexts)

    with patch.dict(
        sys.modules,
        {
            "playwright": MagicMock(),
            "playwright.async_api": fake_pw_module,
        },
    ):
        with patch.object(pool, "_warm_session", side_effect=_set_context):
            first = await pool.get_context()
            second = await pool.get_context()

    assert first is mock_context_1
    assert second is mock_context_2
    assert mock_chromium.launch.await_count == 2
    dead_browser.close.assert_awaited_once()


@pytest.mark.unit
@pytest.mark.asyncio
async def test_browser_pool_close_is_idempotent():
    """close() closes the browser and playwright, and is safe to call twice."""
    from services.catalog.enricher.main import BrowserPool

    pool = BrowserPool()

    mock_browser = MagicMock()
    mock_browser.is_connected.return_value = True
    mock_browser.close = AsyncMock()
    mock_chromium = MagicMock()
    mock_chromium.launch = AsyncMock(return_value=mock_browser)
    mock_pw = MagicMock()
    mock_pw.chromium = mock_chromium
    mock_pw.stop = AsyncMock()

    mock_async_pw = MagicMock()
    mock_async_pw.start = AsyncMock(return_value=mock_pw)
    mock_async_pw_fn = MagicMock(return_value=mock_async_pw)
    fake_pw_module = MagicMock(async_playwright=mock_async_pw_fn)

    with patch.dict(
        sys.modules,
        {
            "playwright": MagicMock(),
            "playwright.async_api": fake_pw_module,
        },
    ):
        mock_context = MagicMock()
        mock_context.close = AsyncMock()

        async def _set_context(self=pool):
            self._context = mock_context

        with patch.object(pool, "_warm_session", side_effect=_set_context):
            await pool.get_context()
        await pool.close()
        await pool.close()  # second call is a no-op

    mock_browser.close.assert_awaited_once()
    mock_pw.stop.assert_awaited_once()


@pytest.mark.unit
@pytest.mark.asyncio
async def test_browser_pool_uses_cdp_when_proxy_url_set():
    """BrowserPool.get_context() connects via CDP when PROXY_URL is set."""
    from services.catalog.enricher.main import BrowserPool

    pool = BrowserPool()

    mock_browser = MagicMock()
    mock_browser.is_connected.return_value = True
    mock_chromium = MagicMock()
    mock_chromium.connect_over_cdp = AsyncMock(return_value=mock_browser)
    mock_chromium.launch = AsyncMock()
    mock_pw = MagicMock()
    mock_pw.chromium = mock_chromium

    mock_async_pw = MagicMock()
    mock_async_pw.start = AsyncMock(return_value=mock_pw)
    mock_async_pw_fn = MagicMock(return_value=mock_async_pw)
    fake_pw_module = MagicMock(async_playwright=mock_async_pw_fn)

    mock_context = MagicMock()

    async def _set_context(self=pool):
        self._context = mock_context

    with patch.dict(
        sys.modules,
        {"playwright": MagicMock(), "playwright.async_api": fake_pw_module},
    ):
        with (
            patch("services.catalog.enricher.main.PROXY_URL", "wss://proxy.example.com:9222"),
            patch.object(pool, "_warm_session", side_effect=_set_context),
        ):
            ctx = await pool.get_context()

    assert ctx is mock_context
    mock_chromium.connect_over_cdp.assert_awaited_once_with("wss://proxy.example.com:9222")
    mock_chromium.launch.assert_not_awaited()


@pytest.mark.unit
@pytest.mark.asyncio
async def test_browser_pool_launches_locally_without_proxy():
    """BrowserPool.get_context() launches local Chromium when PROXY_URL is None."""
    from services.catalog.enricher.main import BrowserPool

    pool = BrowserPool()

    mock_browser = MagicMock()
    mock_browser.is_connected.return_value = True
    mock_chromium = MagicMock()
    mock_chromium.connect_over_cdp = AsyncMock()
    mock_chromium.launch = AsyncMock(return_value=mock_browser)
    mock_pw = MagicMock()
    mock_pw.chromium = mock_chromium

    mock_async_pw = MagicMock()
    mock_async_pw.start = AsyncMock(return_value=mock_pw)
    mock_async_pw_fn = MagicMock(return_value=mock_async_pw)
    fake_pw_module = MagicMock(async_playwright=mock_async_pw_fn)

    mock_context = MagicMock()

    async def _set_context(self=pool):
        self._context = mock_context

    with patch.dict(
        sys.modules,
        {"playwright": MagicMock(), "playwright.async_api": fake_pw_module},
    ):
        with (
            patch("services.catalog.enricher.main.PROXY_URL", None),
            patch.object(pool, "_warm_session", side_effect=_set_context),
        ):
            ctx = await pool.get_context()

    assert ctx is mock_context
    mock_chromium.launch.assert_awaited_once()
    mock_chromium.connect_over_cdp.assert_not_awaited()


# ===== UNIT TESTS - upsert behavior =====


@pytest.mark.unit
def test_create_catalog_item_inserts_new(mock_catalog_db):
    from services.catalog.enricher.db import create_catalog_item

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
    from services.catalog.enricher.db import create_catalog_item

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
    from services.catalog.enricher.db import create_catalog_item

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
    from services.catalog.enricher.db import create_catalog_item

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


@pytest.mark.unit
def test_write_to_db_stores_non_food_item():
    """write_to_db must not skip is_food=False products."""
    from services.catalog.enricher.main import write_to_db

    payload = {
        "raw_name": "Dish Soap 500ml",
        "vendor_name": "colruyt",
        "vendor_product_id": "dish-soap-500ml",
        "product_url": "https://www.collectandgo.be/fr/assortiment/dish-soap-500ml",
    }
    ch = MagicMock()

    mock_enriched = CatalogItemCreate(
        vendor_name="colruyt",
        vendor_product_id="dish-soap-500ml",
        raw_name="Dish Soap 500ml",
        product_url="https://www.collectandgo.be/fr/assortiment/dish-soap-500ml",
        is_food=False,
        price=1.99,
        category="Household",
    )

    mock_item = MagicMock()
    mock_item.canonical_name = "Dish Soap"
    mock_item.raw_name = "Dish Soap 500ml"
    mock_item.net_quantity_value = 500.0
    mock_item.net_quantity_unit = "ml"
    mock_item.price = 1.99
    mock_item.category = "Household"
    mock_item.nutrition = None

    mock_loop = MagicMock()
    mock_loop.run_until_complete.return_value = mock_enriched

    mock_db_session = MagicMock()
    mock_create = MagicMock(return_value=mock_item)

    with (
        patch("services.catalog.enricher.main.enrich_catalog_item", new=MagicMock()),
        patch("services.catalog.enricher.main.get_event_loop", return_value=mock_loop),
        patch("services.catalog.enricher.main.get_db") as mock_get_db,
        patch("services.catalog.enricher.main.create_catalog_item", mock_create),
    ):
        mock_get_db.return_value.__enter__ = MagicMock(return_value=mock_db_session)
        mock_get_db.return_value.__exit__ = MagicMock(return_value=False)
        write_to_db(payload, ch)

    mock_create.assert_called_once_with(mock_enriched, mock_db_session)


# ===== UNIT TESTS - CircuitBreaker =====


@pytest.mark.unit
@pytest.mark.asyncio
async def test_circuit_breaker_no_trip_below_threshold():
    cb = CircuitBreaker(threshold=5, base_pause=1, max_pause=10)
    with patch("services.catalog.enricher.main.browser_pool") as mock_pool:
        for _ in range(4):
            await cb.record_failure()
        mock_pool.reset_session.assert_not_called()


@pytest.mark.unit
@pytest.mark.asyncio
async def test_circuit_breaker_trips_at_threshold():
    cb = CircuitBreaker(threshold=3, base_pause=0, max_pause=10)
    with patch("services.catalog.enricher.main.browser_pool") as mock_pool:
        mock_pool.reset_session = AsyncMock()
        for _ in range(3):
            await cb.record_failure()
        mock_pool.reset_session.assert_called_once()


@pytest.mark.unit
@pytest.mark.asyncio
async def test_circuit_breaker_resets_on_success():
    cb = CircuitBreaker(threshold=3, base_pause=0, max_pause=10)
    with patch("services.catalog.enricher.main.browser_pool") as mock_pool:
        mock_pool.reset_session = AsyncMock()
        await cb.record_failure()
        await cb.record_failure()
        cb.record_success()
        await cb.record_failure()
        await cb.record_failure()
        mock_pool.reset_session.assert_not_called()


@pytest.mark.unit
@pytest.mark.asyncio
async def test_circuit_breaker_exponential_pause():
    cb = CircuitBreaker(threshold=2, base_pause=10, max_pause=100)
    with (
        patch("services.catalog.enricher.main.browser_pool") as mock_pool,
        patch("services.catalog.enricher.main.asyncio.sleep", new_callable=AsyncMock) as mock_sleep,
    ):
        mock_pool.reset_session = AsyncMock()
        # First trip: base_pause * 2^0 = 10
        await cb.record_failure()
        await cb.record_failure()
        mock_sleep.assert_awaited_with(10)

        # Second trip: base_pause * 2^1 = 20
        await cb.record_failure()
        await cb.record_failure()
        mock_sleep.assert_awaited_with(20)

        # Third trip: base_pause * 2^2 = 40
        await cb.record_failure()
        await cb.record_failure()
        mock_sleep.assert_awaited_with(40)


@pytest.mark.unit
@pytest.mark.asyncio
async def test_circuit_breaker_pause_capped_at_max():
    cb = CircuitBreaker(threshold=1, base_pause=100, max_pause=200)
    with (
        patch("services.catalog.enricher.main.browser_pool") as mock_pool,
        patch("services.catalog.enricher.main.asyncio.sleep", new_callable=AsyncMock) as mock_sleep,
    ):
        mock_pool.reset_session = AsyncMock()
        # Trip 1: 100, Trip 2: 200, Trip 3: capped at 200
        await cb.record_failure()
        mock_sleep.assert_awaited_with(100)
        await cb.record_failure()
        mock_sleep.assert_awaited_with(200)
        await cb.record_failure()
        mock_sleep.assert_awaited_with(200)
