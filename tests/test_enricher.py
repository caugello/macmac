"""Tests for catalog enricher functionality."""

import socket
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.catalog.enricher.main import (
    CircuitBreaker,
    PermanentCrawlError,
    _parse_forward_proxy,
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


# ===== UNIT TESTS - process_item exception handling =====


@pytest.mark.unit
def test_process_item_propagates_unexpected_errors():
    from services.catalog.enricher.main import process_item

    payload = {
        "raw_name": "Test Product",
        "vendor_name": "test",
        "vendor_product_id": "test-500g",
        "product_url": "https://www.collectandgo.be/fr/assortiment/test-500g",
    }
    ch = MagicMock()
    bus = MagicMock()

    mock_loop = MagicMock()
    mock_loop.run_until_complete.side_effect = ConnectionError("crawl down")

    with (
        patch("services.catalog.enricher.main.enrich_catalog_item", new=MagicMock()),
        patch("services.catalog.enricher.main.get_event_loop", return_value=mock_loop),
    ):
        with pytest.raises(ConnectionError, match="crawl down"):
            process_item(payload, ch, bus=bus)


@pytest.mark.unit
def test_process_item_skips_publish_on_failed_crawl():
    """process_item must not publish when enrichment returns None."""
    from services.catalog.enricher.main import process_item

    payload = {
        "raw_name": "Blocked Product",
        "vendor_name": "colruyt",
        "vendor_product_id": "blocked-500g",
        "product_url": "https://www.collectandgo.be/fr/assortiment/blocked-500g",
    }
    ch = MagicMock()
    bus = MagicMock()

    mock_loop = MagicMock()
    mock_loop.run_until_complete.return_value = None

    with (
        patch("services.catalog.enricher.main.enrich_catalog_item", new=MagicMock()),
        patch("services.catalog.enricher.main.get_event_loop", return_value=mock_loop),
    ):
        process_item(payload, ch, bus=bus)

    bus.publish.assert_not_called()


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
async def test_browser_pool_launches_locally():
    """BrowserPool.get_context() always launches a local Chromium browser."""
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
        with patch.object(pool, "_warm_session", side_effect=_set_context):
            ctx = await pool.get_context()

    assert ctx is mock_context
    mock_chromium.launch.assert_awaited_once()
    mock_chromium.connect_over_cdp.assert_not_awaited()


@pytest.mark.unit
@pytest.mark.asyncio
async def test_browser_pool_launches_locally_with_forward_proxy():
    """When FORWARD_PROXY is set, the local launch passes it as a proxy kwarg."""
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

    forward_proxy = {"server": "http://host:1234", "username": "u", "password": "p"}

    with patch.dict(
        sys.modules,
        {"playwright": MagicMock(), "playwright.async_api": fake_pw_module},
    ):
        with (
            patch("services.catalog.enricher.main.FORWARD_PROXY", forward_proxy),
            patch.object(pool, "_warm_session", side_effect=_set_context),
        ):
            ctx = await pool.get_context()

    assert ctx is mock_context
    mock_chromium.launch.assert_awaited_once()
    assert mock_chromium.launch.await_args.kwargs["proxy"] == forward_proxy
    mock_chromium.connect_over_cdp.assert_not_awaited()


# ===== UNIT TESTS - non-food products are published =====


@pytest.mark.unit
def test_process_item_publishes_non_food_item():
    """process_item must not skip is_food=False products."""
    from services.catalog.enricher.main import process_item
    from services.shared.constant import CATALOG_ENRICHMENT_RESULTS_QUEUE

    payload = {
        "raw_name": "Dish Soap 500ml",
        "vendor_name": "colruyt",
        "vendor_product_id": "dish-soap-500ml",
        "product_url": "https://www.collectandgo.be/fr/assortiment/dish-soap-500ml",
    }
    ch = MagicMock()
    bus = MagicMock()

    mock_enriched = CatalogItemCreate(
        vendor_name="colruyt",
        vendor_product_id="dish-soap-500ml",
        raw_name="Dish Soap 500ml",
        product_url="https://www.collectandgo.be/fr/assortiment/dish-soap-500ml",
        is_food=False,
        price=1.99,
        category="Household",
    )

    mock_loop = MagicMock()
    mock_loop.run_until_complete.return_value = mock_enriched

    with (
        patch("services.catalog.enricher.main.enrich_catalog_item", new=MagicMock()),
        patch("services.catalog.enricher.main.get_event_loop", return_value=mock_loop),
    ):
        process_item(payload, ch, bus=bus)

    bus.publish.assert_called_once()
    queue_arg, result_arg = bus.publish.call_args.args
    assert queue_arg == CATALOG_ENRICHMENT_RESULTS_QUEUE
    assert result_arg["vendor_name"] == "colruyt"
    assert result_arg["vendor_product_id"] == "dish-soap-500ml"
    assert result_arg["raw_name"] == "Dish Soap 500ml"
    assert result_arg["product_url"] == payload["product_url"]
    assert result_arg["enriched"]["is_food"] is False
    assert result_arg["enriched"]["price"] == 1.99
    assert result_arg["enriched"]["category"] == "Household"


@pytest.mark.unit
def test_process_item_publishes_enriched_payload_shape():
    """process_item must publish original fields plus the full enriched item."""
    from services.catalog.enricher.main import process_item
    from services.shared.constant import CATALOG_ENRICHMENT_RESULTS_QUEUE

    payload = {
        "raw_name": "Pasta 500g",
        "vendor_name": "colruyt",
        "vendor_product_id": "pasta-500g",
        "product_url": "https://www.collectandgo.be/fr/assortiment/pasta-500g",
    }
    ch = MagicMock()
    bus = MagicMock()

    mock_enriched = CatalogItemCreate(
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

    mock_loop = MagicMock()
    mock_loop.run_until_complete.return_value = mock_enriched

    with (
        patch("services.catalog.enricher.main.enrich_catalog_item", new=MagicMock()),
        patch("services.catalog.enricher.main.get_event_loop", return_value=mock_loop),
    ):
        process_item(payload, ch, bus=bus)

    bus.publish.assert_called_once()
    queue_arg, result_arg = bus.publish.call_args.args
    assert queue_arg == CATALOG_ENRICHMENT_RESULTS_QUEUE
    # Original message fields preserved
    assert result_arg["vendor_name"] == "colruyt"
    assert result_arg["vendor_product_id"] == "pasta-500g"
    assert result_arg["raw_name"] == "Pasta 500g"
    assert result_arg["product_url"] == payload["product_url"]
    # Enriched block mirrors the full CatalogItemCreate
    assert result_arg["enriched"] == mock_enriched.model_dump(mode="json")
    assert result_arg["enriched"]["brand"] == "Barilla"
    assert result_arg["enriched"]["nutrition"] == {"energy_kcal": 350}
    assert result_arg["enriched"]["image_url"] == "https://example.com/pasta.jpg"


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


# ===== UNIT TESTS - WAF-block handling =====


@pytest.mark.unit
def test_waf_block_statuses_include_456():
    """collectandgo.be's WAF returns HTTP 456; it must be treated as a block."""
    from services.catalog.enricher.main import WAF_BLOCK_STATUSES

    assert 456 in WAF_BLOCK_STATUSES
    assert {403, 405}.issubset(WAF_BLOCK_STATUSES)


def _page_responding_with(status: int):
    """Build a fake Playwright page+context whose goto() returns the given status."""
    mock_response = MagicMock()
    mock_response.status = status

    mock_page = MagicMock()
    mock_page.goto = AsyncMock(return_value=mock_response)
    mock_page.add_init_script = AsyncMock()
    mock_page.close = AsyncMock()

    mock_context = MagicMock()
    mock_context.new_page = AsyncMock(return_value=mock_page)
    return mock_context


@pytest.mark.unit
@pytest.mark.asyncio
@pytest.mark.parametrize("status", [403, 405, 456])
async def test_crawl_product_page_waf_status_raises_retryable(status):
    """A WAF-block status raises a retryable RuntimeError (no proxy switch, not permanent)
    so async_retry retries and the CircuitBreaker eventually trips."""
    from services.catalog.enricher import main as enricher

    mock_context = _page_responding_with(status)

    with patch.object(
        enricher.browser_pool, "get_context", new=AsyncMock(return_value=mock_context)
    ):
        with pytest.raises(RuntimeError) as exc_info:
            await enricher._crawl_product_page_once("https://shop.example.com/product")

    assert not isinstance(exc_info.value, enricher.PermanentCrawlError)
    assert str(status) in str(exc_info.value)


@pytest.mark.unit
@pytest.mark.asyncio
@pytest.mark.parametrize("status", [429, 502, 503])
async def test_crawl_product_page_transient_status_raises_retryable(status):
    """Transient 429/502/503 statuses raise the same retryable RuntimeError."""
    from services.catalog.enricher import main as enricher

    mock_context = _page_responding_with(status)

    with patch.object(
        enricher.browser_pool, "get_context", new=AsyncMock(return_value=mock_context)
    ):
        with pytest.raises(RuntimeError) as exc_info:
            await enricher._crawl_product_page_once("https://shop.example.com/product")

    assert not isinstance(exc_info.value, enricher.PermanentCrawlError)


@pytest.mark.unit
@pytest.mark.asyncio
async def test_crawl_product_page_404_raises_permanent():
    """HTTP 404 stays a non-retryable PermanentCrawlError."""
    from services.catalog.enricher import main as enricher

    mock_context = _page_responding_with(404)

    with patch.object(
        enricher.browser_pool, "get_context", new=AsyncMock(return_value=mock_context)
    ):
        with pytest.raises(enricher.PermanentCrawlError):
            await enricher._crawl_product_page_once("https://shop.example.com/product")


# ===== UNIT TESTS - crawl_nutrition_page SSRF protection (SECURITY_AUDIT C-2) =====


def _getaddrinfo_returning(ip: str):
    """Build a fake socket.getaddrinfo result resolving to the given IP."""

    def _fake(host, port, family=0, type=0, proto=0, flags=0):
        return [(socket.AF_INET, socket.SOCK_STREAM, 0, "", (ip, 0))]

    return _fake


@pytest.mark.unit
@pytest.mark.asyncio
async def test_crawl_nutrition_page_rejects_cloud_metadata_ssrf():
    """An attacker-controlled product page can redirect the crawler at its own
    nutrition/info link to a cloud metadata endpoint. crawl_nutrition_page must
    reject the URL via validate_url() before any browser fetch is attempted.
    """
    from services.catalog.enricher import main as enricher

    # 169.254.169.254 is the cloud metadata endpoint (link-local, blocked).
    with patch(
        "services.shared.lib.url_validator.socket.getaddrinfo",
        _getaddrinfo_returning("169.254.169.254"),
    ):
        with patch.object(
            enricher.browser_pool, "get_context", new=AsyncMock()
        ) as mock_get_context:
            with pytest.raises(ValueError, match="blocked network"):
                await enricher.crawl_nutrition_page(
                    "http://metadata.attacker.example/latest/meta-data/",
                    main_page_url="https://shop.example.com/product",
                )

    # The guard must fire before any network/browser work happens.
    mock_get_context.assert_not_awaited()


@pytest.mark.unit
@pytest.mark.asyncio
async def test_crawl_nutrition_page_rejects_internal_ip_ssrf():
    """A nutrition URL resolving to a private RFC1918 host (e.g. an internal
    Redis/DB) must be rejected before fetch.
    """
    from services.catalog.enricher import main as enricher

    with patch(
        "services.shared.lib.url_validator.socket.getaddrinfo",
        _getaddrinfo_returning("10.0.0.5"),
    ):
        with patch.object(
            enricher.browser_pool, "get_context", new=AsyncMock()
        ) as mock_get_context:
            with pytest.raises(ValueError, match="blocked network"):
                await enricher.crawl_nutrition_page(
                    "http://internal.attacker.example/info",
                    main_page_url="https://shop.example.com/product",
                )

    mock_get_context.assert_not_awaited()


@pytest.mark.unit
@pytest.mark.asyncio
async def test_crawl_nutrition_page_allows_external_host():
    """A legitimate external nutrition URL passes validation and reaches the
    fetch path (guards against over-blocking).
    """
    from services.catalog.enricher import main as enricher

    with patch(
        "services.shared.lib.url_validator.socket.getaddrinfo",
        _getaddrinfo_returning("93.184.216.34"),
    ):
        with patch.object(
            enricher,
            "_crawl_nutrition_page_once",
            new=AsyncMock(return_value=("<html></html>", "nutrition table")),
        ) as mock_once:
            result = await enricher.crawl_nutrition_page(
                "https://shop.example.com/product/info",
                main_page_url="https://shop.example.com/product",
            )

    assert result == ("<html></html>", "nutrition table")
    mock_once.assert_awaited_once()


# ===== UNIT TESTS - WORKER_LOCATION tagging =====


def _enriched_item_for(raw_name: str, product_url: str) -> CatalogItemCreate:
    """Minimal valid enriched item for process_item publish tests."""
    return CatalogItemCreate(
        vendor_name="colruyt",
        vendor_product_id="loc-500g",
        raw_name=raw_name,
        product_url=product_url,
        is_food=True,
    )


@pytest.mark.unit
def test_process_item_stamps_worker_location_in_result(caplog):
    """process_item must include the WORKER_LOCATION tag in the published result and logs."""
    from services.catalog.enricher import main as enricher

    payload = {
        "raw_name": "Tagged Product",
        "vendor_name": "colruyt",
        "vendor_product_id": "loc-500g",
        "product_url": "https://www.collectandgo.be/fr/assortiment/loc-500g",
    }
    ch = MagicMock()
    bus = MagicMock()

    enriched = _enriched_item_for(payload["raw_name"], payload["product_url"])
    mock_loop = MagicMock()
    mock_loop.run_until_complete.return_value = enriched

    with (
        patch.object(enricher, "WORKER_LOCATION", "vps-a"),
        patch.object(enricher, "enrich_catalog_item", new=MagicMock()),
        patch.object(enricher, "get_event_loop", return_value=mock_loop),
    ):
        with caplog.at_level("INFO", logger="MacMac"):
            enricher.process_item(payload, ch, bus=bus)

    bus.publish.assert_called_once()
    _, published_result = bus.publish.call_args.args
    assert published_result["worker_location"] == "vps-a"
    assert "worker_location=vps-a" in caplog.text


@pytest.mark.unit
def test_worker_location_defaults_to_central(monkeypatch):
    """When WORKER_LOCATION is unset, the module default must be 'central'."""
    import importlib

    monkeypatch.delenv("WORKER_LOCATION", raising=False)
    from services.catalog.enricher import main as enricher

    reloaded = importlib.reload(enricher)
    try:
        assert reloaded.WORKER_LOCATION == "central"
    finally:
        # Restore the module to its env-driven state for other tests.
        importlib.reload(reloaded)


# ===== UNIT TESTS - _parse_forward_proxy =====


@pytest.mark.unit
def test_parse_forward_proxy_none():
    """A falsy value yields None (no forward proxy configured)."""
    assert _parse_forward_proxy(None) is None
    assert _parse_forward_proxy("") is None


@pytest.mark.unit
def test_parse_forward_proxy_with_credentials():
    """A full URL is split into server + decoded username/password."""
    assert _parse_forward_proxy("http://u:p@host:1234") == {
        "server": "http://host:1234",
        "username": "u",
        "password": "p",
    }


@pytest.mark.unit
def test_parse_forward_proxy_without_credentials():
    """A URL with no creds yields only the server key."""
    assert _parse_forward_proxy("http://host:1234") == {"server": "http://host:1234"}


@pytest.mark.unit
def test_parse_forward_proxy_decodes_credentials():
    """URL-encoded username/password are decoded."""
    assert _parse_forward_proxy("http://us%40er:p%3Ass@host:1234") == {
        "server": "http://host:1234",
        "username": "us@er",
        "password": "p:ss",
    }
