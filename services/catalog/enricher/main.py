import asyncio
import functools
import json
import os
import re
import signal
import time
import urllib.parse
from dataclasses import dataclass
from datetime import date, datetime
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from playwright.async_api import Browser

from services.config import get_config, get_config_for_service, get_config_for_service_dependency
from services.framework.logging import setup_logging
from services.shared.constant import (
    CATALOG_ENRICHMENT_RESULTS_QUEUE,
    CATALOG_PROCESS_ENTITY_QUEUE,
)
from services.shared.lib.catalog_taxonomy import format_categories_bullets
from services.shared.lib.messaging_bus import MessagingBus
from services.shared.lib.svg_sanitizer import sanitize_nutriscore_svg
from services.shared.lib.url_validator import validate_url
from services.shared.schemas.catalog import CatalogItemCreate


@dataclass
class CrawlResult:
    html_content: str | None = None
    final_url: str | None = None
    extracted_price: float | None = None
    info_link_url: str | None = None
    nutriscore: str | None = None
    nutriscore_svg: str | None = None
    promotion_until_date: date | None = None
    image_url: str | None = None


logger = setup_logging()

# Load configuration
config = get_config()
catalog_config = get_config_for_service("catalog")

# API key from environment (SECURITY REQUIREMENT)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Location tag for this enricher worker. Stamped into logs and result messages
# so jobs can be correlated to the site (central / remote VPS) that processed them.
WORKER_LOCATION = os.getenv("WORKER_LOCATION", "central")

# Enricher configuration from config.yaml
OPENAI_MODEL = catalog_config.enricher.openai_model if catalog_config.enricher else "gpt-4o-mini"
PAGE_TIMEOUT = catalog_config.enricher.page_timeout if catalog_config.enricher else 15000
# Adaptive pacer target: hold the per-worker outbound request rate at this many
# requests/min regardless of how long each item takes to enrich. Item processing
# time varies with the mix (non-food items need less LLM work than food), so a
# fixed per-item delay would let a non-food-heavy run exceed the ceiling. Pacing
# on a minimum interval between request starts absorbs that variance.
ENRICHER_TARGET_RATE_PER_MIN = (
    catalog_config.enricher.target_rate_per_min if catalog_config.enricher else 2.7
)
MIN_REQUEST_INTERVAL = 60.0 / ENRICHER_TARGET_RATE_PER_MIN
MAX_RETRIES = catalog_config.enricher.max_retries if catalog_config.enricher else 3
RETRY_BACKOFF = catalog_config.enricher.retry_backoff if catalog_config.enricher else 2.0
CIRCUIT_BREAKER_THRESHOLD = (
    catalog_config.enricher.circuit_breaker_threshold if catalog_config.enricher else 10
)
CIRCUIT_BREAKER_BASE_PAUSE = (
    catalog_config.enricher.circuit_breaker_base_pause if catalog_config.enricher else 1800
)
CIRCUIT_BREAKER_MAX_PAUSE = (
    catalog_config.enricher.circuit_breaker_max_pause if catalog_config.enricher else 7200
)
FORWARD_PROXY_URL = catalog_config.enricher.forward_proxy_url if catalog_config.enricher else None


def _parse_forward_proxy(raw: str | None) -> dict[str, str] | None:
    """Parse a forward-proxy URL into Playwright launch proxy kwargs.

    Returns None when unset. Username/password are URL-decoded. A malformed
    value must not crash import, so this stays a simple, defensive parse.
    """
    if not raw:
        return None
    parsed = urllib.parse.urlparse(raw)
    proxy: dict[str, str] = {"server": f"{parsed.scheme}://{parsed.hostname}:{parsed.port}"}
    if parsed.username:
        proxy["username"] = urllib.parse.unquote(parsed.username)
    if parsed.password:
        proxy["password"] = urllib.parse.unquote(parsed.password)
    return proxy


# Per-worker static ISP/residential forward proxy for the LOCAL Chromium launch.
FORWARD_PROXY = _parse_forward_proxy(FORWARD_PROXY_URL)

WAF_BLOCK_STATUSES = {403, 405, 456}


# Global counters for rate limiting
items_processed = 0
# Monotonic-ish wall-clock timestamp of the previous request start, used by the
# adaptive pacer to enforce MIN_REQUEST_INTERVAL between request starts. Zero on
# the first item yields a huge elapsed, so the first request is never paced.
last_request_time = 0.0


async def _pace_request() -> None:
    """Adaptive pacer: hold a steady per-worker outbound request rate.

    Sleeps only for the remainder of MIN_REQUEST_INTERVAL since the previous
    request start, so the rate stays at the target regardless of how long each
    item took to process (non-food items need less LLM work than food). The
    first call sees last_request_time == 0.0, yielding a huge elapsed and no
    sleep. Per-process, which is correct: each worker has its own egress IP.
    """
    global last_request_time
    elapsed = time.time() - last_request_time
    if elapsed < MIN_REQUEST_INTERVAL:
        sleep_time = MIN_REQUEST_INTERVAL - elapsed
        logger.info(f"Adaptive pause {sleep_time:.1f}s (prev item took {elapsed:.1f}s)")
        await asyncio.sleep(sleep_time)
    last_request_time = time.time()


# Single persistent event loop shared across all RabbitMQ messages. The shared
# Chromium browser is bound to this loop, so it must outlive individual messages
# (a fresh loop per message would orphan the browser).
_event_loop: asyncio.AbstractEventLoop | None = None


def get_event_loop() -> asyncio.AbstractEventLoop:
    """Return the persistent event loop, creating it on first use."""
    global _event_loop
    if _event_loop is None or _event_loop.is_closed():
        _event_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(_event_loop)
    return _event_loop


def shutdown_browser() -> None:
    """Close the shared browser and event loop on consumer shutdown."""
    global _event_loop
    if _event_loop is not None and not _event_loop.is_closed():
        try:
            _event_loop.run_until_complete(browser_pool.close())
        except Exception as e:
            logger.warning(f"Error during browser shutdown: {e}")
        finally:
            _event_loop.close()
            _event_loop = None


# Regex for extracting quantity from URL
# Matches patterns like: 280g, 1kg, 500ml, 1.5l, 375g
URL_QTY_PATTERN = re.compile(r"-(\d+(?:[.,]\d+)?)(g|kg|ml|l|cl)(?:-|$)", re.IGNORECASE)

# Regex for extracting promotion end date from text like "1+1 GRATUIT du 06/05/2026 au inclus 19/05/2026"
PROMOTION_END_DATE_PATTERN = re.compile(r"au\s+inclus\s+(\d{2}/\d{2}/\d{4})")


class PermanentCrawlError(Exception):
    """Non-retryable crawl failure (e.g. HTTP 404)."""


class CircuitBreaker:
    """Pauses crawling when consecutive failures exceed a threshold.

    After ``threshold`` consecutive crawl failures the breaker trips:
    it sleeps for an exponentially growing pause (base * 2^trips, capped
    at max_pause) and forces a fresh browser session before resuming.
    A single successful crawl resets the counter.
    """

    def __init__(
        self,
        threshold: int = CIRCUIT_BREAKER_THRESHOLD,
        base_pause: int = CIRCUIT_BREAKER_BASE_PAUSE,
        max_pause: int = CIRCUIT_BREAKER_MAX_PAUSE,
    ) -> None:
        self._threshold = threshold
        self._base_pause = base_pause
        self._max_pause = max_pause
        self._consecutive_failures = 0
        self._trips = 0

    def record_success(self) -> None:
        if self._consecutive_failures > 0:
            logger.info(
                f"Circuit breaker: crawl succeeded after {self._consecutive_failures} "
                f"consecutive failures — resetting"
            )
        self._consecutive_failures = 0
        self._trips = 0

    async def record_failure(self) -> None:
        self._consecutive_failures += 1
        if self._consecutive_failures >= self._threshold:
            self._trips += 1
            pause = min(self._base_pause * (2 ** (self._trips - 1)), self._max_pause)
            logger.warning(
                f"Circuit breaker TRIPPED (trip #{self._trips}): "
                f"{self._consecutive_failures} consecutive crawl failures. "
                f"Pausing {pause}s and resetting browser session."
            )
            self._consecutive_failures = 0
            await browser_pool.reset_session()
            await asyncio.sleep(pause)


circuit_breaker = CircuitBreaker()


async def async_retry(
    coro_func,
    *args,
    max_retries: int = MAX_RETRIES,
    backoff: float = RETRY_BACKOFF,
    retryable_exceptions: tuple = (Exception,),
    non_retryable_exceptions: tuple = (),
    label: str = "operation",
    **kwargs,
):
    last_error = None
    for attempt in range(max_retries):
        try:
            return await coro_func(*args, **kwargs)
        except non_retryable_exceptions:
            raise
        except retryable_exceptions as e:
            last_error = e
            if attempt < max_retries - 1:
                wait = backoff * (2**attempt)
                logger.warning(
                    f"{label} failed (attempt {attempt + 1}/{max_retries}), "
                    f"retrying in {wait:.1f}s: {e}"
                )
                await asyncio.sleep(wait)
            else:
                logger.error(f"{label} failed after {max_retries} attempts: {e}")
    raise last_error


def normalize_unit(unit: str | None) -> str | None:
    """
    Normalize unit strings to valid UnitEnum values.
    Maps common variations to schema-compliant units.
    """
    if not unit:
        return None

    unit_lower = unit.lower().strip()

    # Direct mapping for variations
    unit_map = {
        # Pieces
        "piece": "pc",
        "pieces": "pc",
        "pcs": "pc",
        "stuks": "pc",
        "stuk": "pc",
        "st": "pc",
        # Weight
        "gram": "g",
        "grams": "g",
        "gr": "g",
        "kilo": "kg",
        "kilogram": "kg",
        # Volume
        "milliliter": "ml",
        "milliliters": "ml",
        "liter": "l",
        "liters": "l",
        "centiliter": "ml",  # Will be converted
        "cl": "ml",
        # Spoons
        "teaspoon": "tsp",
        "teaspoons": "tsp",
        "tablespoon": "tbsp",
        "tablespoons": "tbsp",
    }

    # Check if it's already valid
    valid_units = {"g", "kg", "ml", "l", "tsp", "tbsp", "pc", "pinch", "dash"}
    if unit_lower in valid_units:
        return unit_lower

    # Try mapping
    return unit_map.get(unit_lower)


def extract_quantity_from_url(url: str) -> tuple[float | None, str | None]:
    """
    Extract quantity and unit from product URL.
    Examples:
      - .../boni-zonnebloempitten-280g → (280.0, 'g')
      - .../pasta-500g → (500.0, 'g')
      - .../milk-1l → (1.0, 'l')
      - .../juice-1.5l → (1.5, 'l')
    """
    match = URL_QTY_PATTERN.search(url)
    if not match:
        return None, None

    qty_str = match.group(1).replace(",", ".")
    unit = match.group(2).lower()

    try:
        qty = float(qty_str)
    except ValueError:
        return None, None

    # Handle centiliters conversion before normalization
    if unit == "cl":
        qty = qty * 10
        unit = "ml"

    # Normalize unit to schema-compliant value
    normalized = normalize_unit(unit)
    if normalized:
        return qty, normalized

    return None, None


CHROMIUM_ARGS = [
    "--disable-dev-shm-usage",
    "--no-sandbox",
    "--disable-blink-features=AutomationControlled",
]

BROWSER_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
)


HOMEPAGE_URL = "https://www.collectandgo.be/fr/home"

CONTEXT_OPTIONS: dict[str, Any] = {
    "viewport": {"width": 1440, "height": 900},
    "user_agent": BROWSER_UA,
    "locale": "fr-BE",
    "timezone_id": "Europe/Brussels",
    "color_scheme": "light",
    "extra_http_headers": {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-BE,fr;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
    },
}

WEBDRIVER_OVERRIDE = """
    Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
    });
"""


class BrowserPool:
    """Owns a Playwright browser for crawling product pages.

    Keeps a single long-lived local Chromium browser with a warmed context
    (homepage visit, cookie consent) so session state persists across pages.
    """

    def __init__(self) -> None:
        self._playwright: Any = None
        self._browser: Browser | None = None
        self._context: Any = None

    async def get_context(self) -> Any:
        from playwright.async_api import async_playwright

        if self._playwright is None:
            self._playwright = await async_playwright().start()

        if self._browser is None or not self._browser.is_connected():
            if self._browser is not None:
                logger.warning("Chromium browser disconnected, relaunching")
                try:
                    await self._browser.close()
                except Exception:
                    pass
            launch_kwargs: dict[str, Any] = {"headless": True, "args": CHROMIUM_ARGS}
            if FORWARD_PROXY:
                launch_kwargs["proxy"] = FORWARD_PROXY
            self._browser = await self._playwright.chromium.launch(**launch_kwargs)
            if FORWARD_PROXY:
                logger.info(
                    "Launched local Chromium browser with forward proxy %s",
                    FORWARD_PROXY["server"],
                )
            else:
                logger.info("Launched local Chromium browser without forward proxy")
            self._context = None

        if self._context is None:
            await self._warm_session()

        return self._context

    async def _warm_session(self) -> None:
        """Create a context, visit homepage to pass anti-bot challenge (local mode only)."""
        self._context = await self._browser.new_context(**CONTEXT_OPTIONS)
        page = await self._context.new_page()
        await page.add_init_script(WEBDRIVER_OVERRIDE)

        try:
            resp = await page.goto(HOMEPAGE_URL, timeout=15000, wait_until="domcontentloaded")
            logger.info(f"Warm-up homepage status: {resp.status if resp else 'None'}")
            await asyncio.sleep(3.0)

            try:
                accept_btn = await page.query_selector("#onetrust-accept-btn-handler")
                if accept_btn:
                    await accept_btn.click()
                    logger.info("Accepted cookie consent")
                    await asyncio.sleep(1.0)
            except Exception as e:
                logger.debug(f"No cookie consent banner: {e}")

            await page.evaluate("window.scrollTo({top: 400, behavior: 'smooth'})")
            await asyncio.sleep(1.0)
            await page.evaluate("window.scrollTo({top: 800, behavior: 'smooth'})")
            await asyncio.sleep(1.0)
            logger.info("Session warmed successfully")
        except Exception as e:
            logger.warning(f"Warm-up failed: {e}")
        finally:
            await page.close()

    async def reset_session(self) -> None:
        """Drop the current browser context so the next get_context() warms a fresh one."""
        if self._context is not None:
            try:
                await self._context.close()
            except Exception:
                pass
            self._context = None
            logger.info("Browser session reset — next crawl will warm a new one")

    async def close(self) -> None:
        if self._context is not None:
            try:
                await self._context.close()
            except Exception:
                pass
            self._context = None
        if self._browser is not None:
            try:
                await self._browser.close()
            except Exception as e:
                logger.warning(f"Error closing browser: {e}")
            self._browser = None
        if self._playwright is not None:
            try:
                await self._playwright.stop()
            except Exception as e:
                logger.warning(f"Error stopping playwright: {e}")
            self._playwright = None


# Single shared browser reused across every product processed by this pod.
browser_pool = BrowserPool()


async def _crawl_product_page_once(url: str) -> CrawlResult:
    context = await browser_pool.get_context()
    page = await context.new_page()
    await page.add_init_script(WEBDRIVER_OVERRIDE)

    try:
        logger.debug("Navigating to product page")
        response = await page.goto(
            url, timeout=15000, wait_until="domcontentloaded", referer=HOMEPAGE_URL
        )

        if not response:
            raise RuntimeError(f"No response from {url}")

        if response.status == 404:
            raise PermanentCrawlError(f"HTTP 404 from {url}")

        if response.status in WAF_BLOCK_STATUSES or response.status in (429, 502, 503):
            raise RuntimeError(f"WAF/transient block (HTTP {response.status}) from {url}")

        if response.status >= 400:
            raise PermanentCrawlError(f"HTTP {response.status} from {url}")

        final_url = page.url
        if final_url != url:
            logger.debug(f"Redirected to: {final_url}")

        await asyncio.sleep(0.5 + (asyncio.get_event_loop().time() % 1))

        await page.evaluate("""
            window.scrollTo({
                top: document.body.scrollHeight / 3,
                behavior: 'smooth'
            });
        """)
        await asyncio.sleep(0.3)

        await page.wait_for_timeout(1500)

        extracted_price = None
        try:
            await page.wait_for_selector(
                'span.price-per-unit, [class*="price"]', timeout=3000, state="visible"
            )

            price_element = await page.query_selector("span.price-per-unit")
            if price_element:
                price_text = await price_element.inner_text()
                price_text = (
                    price_text.strip()
                    .replace("\n", "")
                    .replace("\r", "")
                    .replace("€", "")
                    .replace(" ", "")
                    .replace(",", ".")
                )

                price_text = re.sub(r"/[a-z]+$", "", price_text)

                try:
                    extracted_price = float(price_text)
                    logger.debug(f"Extracted price: EUR {extracted_price:.2f}")
                except ValueError:
                    logger.warning(f"Could not parse price: {repr(price_text)}")
        except Exception as e:
            logger.warning(f"Could not extract price: {e}")

        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await asyncio.sleep(0.5)

        nutriscore = None
        nutriscore_svg = None
        try:
            nutriscore_el = await page.query_selector("dsce-product-score")
            if nutriscore_el:
                nutriscore = await nutriscore_el.get_attribute("nutri-score")
                if nutriscore:
                    nutriscore = nutriscore.strip().upper()
                    logger.debug(f"Nutri-Score: {nutriscore}")

                nutriscore_svg = await page.evaluate("""() => {
                    const el = document.querySelector('dsce-product-score');
                    if (!el) return null;
                    const root = el.shadowRoot || el;
                    const container = root.querySelector('div > div.nutri-score > div');
                    if (!container) return null;
                    const svg = container.querySelector('svg');
                    return svg ? svg.outerHTML : container.innerHTML;
                }""")
                nutriscore_svg = sanitize_nutriscore_svg(nutriscore_svg)
                if nutriscore_svg:
                    logger.debug(f"Nutri-Score SVG extracted ({len(nutriscore_svg)} chars)")
        except Exception as e:
            logger.warning(f"Could not extract Nutri-Score: {e}")

        image_url = None
        try:
            img_el = await page.query_selector("#productMainImage, .product_image img[src]")
            if img_el:
                image_url = await img_el.get_attribute("src")
                if image_url:
                    if image_url.startswith("//"):
                        image_url = "https:" + image_url
                    elif image_url.startswith("/"):
                        base = final_url.split("/")[0] + "//" + final_url.split("/")[2]
                        image_url = base + image_url
                    logger.info(f"Product image: {image_url}")
        except Exception as e:
            logger.warning(f"Could not extract product image: {e}")

        promotion_until_date = None
        try:
            promo_el = await page.query_selector("div.promotion")
            if promo_el:
                promo_text = await promo_el.inner_text()
                if promo_text:
                    logger.debug(f"Promotion text: {promo_text.strip()}")
                    match = PROMOTION_END_DATE_PATTERN.search(promo_text)
                    if match:
                        promotion_until_date = datetime.strptime(match.group(1), "%d/%m/%Y").date()
                        logger.debug(f"Promotion until: {promotion_until_date}")
        except Exception as e:
            logger.warning(f"Could not extract promotion: {e}")

        html = await page.content()

        info_link_url = None
        try:
            info_link = await page.query_selector(
                'a:has-text("plus d\'infos"), a:has-text("Plus d\'infos"), a:has-text("meer info"), a:has-text("Meer info")'
            )
            if info_link:
                info_href = await info_link.get_attribute("href")
                if info_href:
                    if info_href.startswith("/"):
                        base = final_url.split("/")[0] + "//" + final_url.split("/")[2]
                        info_link_url = base + info_href
                    elif not info_href.startswith("http"):
                        info_link_url = final_url.rsplit("/", 1)[0] + "/" + info_href
                    else:
                        info_link_url = info_href
                    logger.debug(f"Found product info link: {info_link_url}")
        except Exception as e:
            logger.warning(f"Could not find product info link: {e}")

        return CrawlResult(
            html_content=html,
            final_url=final_url,
            extracted_price=extracted_price,
            info_link_url=info_link_url,
            nutriscore=nutriscore,
            nutriscore_svg=nutriscore_svg,
            promotion_until_date=promotion_until_date,
            image_url=image_url,
        )
    finally:
        await page.close()


async def crawl_product_page(url: str) -> CrawlResult:
    from urllib.parse import unquote

    url = unquote(url)
    validate_url(url)

    async def _attempt() -> CrawlResult:
        return await _crawl_product_page_once(url)

    try:
        result = await async_retry(
            _attempt,
            retryable_exceptions=(RuntimeError, OSError, TimeoutError),
            non_retryable_exceptions=(PermanentCrawlError,),
            label=f"crawl_product_page({url})",
        )
        circuit_breaker.record_success()
        return result
    except PermanentCrawlError as e:
        logger.error(f"Permanent crawl failure: {e}")
        await circuit_breaker.record_failure()
        return CrawlResult()
    except Exception as e:
        logger.error(f"Error crawling {url} after {MAX_RETRIES} attempts: {e}")
        await circuit_breaker.record_failure()
        return CrawlResult()


async def _crawl_nutrition_page_once(
    info_url: str, main_page_url: str
) -> tuple[str | None, str | None]:
    context = await browser_pool.get_context()

    page = await context.new_page()
    await page.add_init_script(WEBDRIVER_OVERRIDE)

    try:
        response = await page.goto(
            info_url, timeout=PAGE_TIMEOUT, wait_until="domcontentloaded", referer=main_page_url
        )

        if not response:
            raise RuntimeError(f"No response from nutrition page {info_url}")

        if response.status == 404:
            raise PermanentCrawlError(f"HTTP 404 from nutrition page {info_url}")

        if response.status in WAF_BLOCK_STATUSES or response.status in (429, 502, 503):
            raise RuntimeError(
                f"WAF/transient block (HTTP {response.status}) from nutrition page {info_url}"
            )

        if response.status >= 400:
            raise PermanentCrawlError(f"HTTP {response.status} from nutrition page {info_url}")

        await page.wait_for_timeout(2000)
        await page.evaluate(
            "window.scrollTo({top: document.body.scrollHeight / 2, behavior: 'smooth'})"
        )
        await asyncio.sleep(0.8)
        await page.evaluate(
            "window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'})"
        )
        await asyncio.sleep(1.0)

        nutrition_table_text = None
        try:
            # Collect&Go info pages hide nutrition in collapsed accordion sections.
            # Try clicking expand buttons so the table becomes visible.
            for sel in [
                'button:has-text("Valeurs nutritionnelles")',
                'button:has-text("Voedingswaarde")',
                'button:has-text("Nutritional")',
                '[class*="accordion"]:has-text("nutri")',
            ]:
                try:
                    btn = await page.query_selector(sel)
                    if btn:
                        await btn.click()
                        await page.wait_for_timeout(500)
                        break
                except Exception:
                    pass

            table_visible = True
            try:
                await page.wait_for_selector("table", timeout=5000, state="visible")
            except Exception:
                # Table in DOM but hidden (collapsed accordion) — still readable
                table_visible = False
                await page.wait_for_selector("table", timeout=2000, state="attached")

            tables = await page.query_selector_all("table")
            for table in tables:
                # inner_text() respects CSS visibility; text_content() does not
                table_text = await (table.inner_text() if table_visible else table.text_content())
                if table_text and any(
                    keyword in table_text.lower()
                    for keyword in [
                        "valeur nutritionnelle",
                        "voedingswaarde",
                        "nutrition",
                        "energie",
                        "energy",
                        "protéine",
                        "protein",
                        "kcal",
                        "glucide",
                        "carbohydrate",
                        "lipide",
                        "fat",
                        "par 100",
                    ]
                ):
                    nutrition_table_text = table_text
                    logger.debug(f"Extracted nutrition table ({len(table_text)} chars)")
                    break
        except Exception as e:
            logger.warning(f"Could not extract nutrition table: {e}")

        detailed_html = await page.content()
        return detailed_html, nutrition_table_text
    finally:
        await page.close()


async def crawl_nutrition_page(info_url: str, main_page_url: str) -> tuple[str | None, str | None]:
    from urllib.parse import unquote

    if not info_url:
        logger.debug("No product info link provided")
        return None, None

    info_url = unquote(info_url)
    validate_url(info_url)
    logger.debug(f"Crawling nutrition page: {info_url}")

    async def _attempt() -> tuple[str | None, str | None]:
        return await _crawl_nutrition_page_once(info_url, main_page_url)

    try:
        return await async_retry(
            _attempt,
            retryable_exceptions=(RuntimeError, OSError, TimeoutError),
            non_retryable_exceptions=(PermanentCrawlError,),
            label=f"crawl_nutrition_page({info_url})",
        )
    except (PermanentCrawlError, Exception) as e:
        logger.error(f"Failed to crawl nutrition page after retries: {e}")
        return None, None


def sanitize_for_llm(text: str, max_length: int = 50000) -> str:
    patterns = [
        r"(?i)ignore\s+(previous|all|above|prior)\s+instructions",
        r"(?i)system\s*:",
        r"(?i)assistant\s*:",
        r"(?i)user\s*:",
        r"<\|im_start\|>",
        r"<\|im_end\|>",
        r"(?i)you\s+are\s+now",
        r"(?i)new\s+instructions?\s*:",
    ]
    for pattern in patterns:
        text = re.sub(pattern, "[FILTERED]", text)
    return text[:max_length]


def preprocess_html(html_content: str) -> str:
    """
    Extract relevant sections from HTML and remove noise.
    Focus on product info, price, and nutrition sections.
    Prioritizes extracted nutrition table if present.
    """
    from bs4 import BeautifulSoup

    # Check for extracted nutrition table at the top
    nutrition_table = ""
    if html_content.startswith("<!-- EXTRACTED NUTRITION TABLE -->"):
        parts = html_content.split("\n\n", 2)
        if len(parts) >= 3:
            nutrition_table = parts[1]  # The nutrition table text
            html_content = parts[2]  # Rest of HTML

    # Check if this is combined HTML (main page + detailed info page)
    html_parts = html_content.split("<!-- DETAILED PRODUCT INFO PAGE -->")

    processed_parts = []
    for part_html in html_parts:
        soup = BeautifulSoup(part_html, "html.parser")

        # Remove script and style elements
        for script in soup(["script", "style", "noscript"]):
            script.decompose()

        # Try to find product-specific sections
        relevant_sections = []

        # Look for product details, price, nutrition sections
        for selector in [
            '[class*="product"]',
            '[class*="Product"]',
            '[class*="price"]',
            '[class*="Price"]',
            '[class*="nutrition"]',
            '[class*="Nutrition"]',
            '[class*="voedingswaarde"]',
            '[class*="Voedingswaarde"]',
            '[class*="valeur"]',
            '[class*="Valeur"]',
            '[class*="detail"]',
            '[class*="Detail"]',
            '[class*="info"]',
            '[class*="Info"]',
            "main",
            "article",
            "table",
        ]:
            elements = soup.select(selector)
            for elem in elements:
                text = elem.get_text(separator=" ", strip=True)
                if len(text) > 20:  # Skip empty or tiny sections
                    relevant_sections.append(text)

        # Also look for text containing nutrition keywords
        for keyword in ["valeurs nutritionnelles", "voedingswaarde", "per 100", "par 100"]:
            for elem in soup.find_all(
                string=lambda text, kw=keyword: text and kw.lower() in text.lower()
            ):
                parent = elem.find_parent(["div", "section", "table", "article"])
                if parent:
                    text = parent.get_text(separator=" ", strip=True)
                    if len(text) > 20 and text not in relevant_sections:
                        relevant_sections.append(text)

        if relevant_sections:
            combined = " ".join(relevant_sections[:15])  # Top 15 sections
            processed_parts.append(combined)
        else:
            # Fallback: clean full text
            text = soup.get_text(separator=" ", strip=True)
            processed_parts.append(text[:50000])

    # Join both parts with delimiter
    result = "\n\n=== DETAILED PRODUCT INFO PAGE ===\n\n".join(processed_parts)

    # Prepend nutrition table if we extracted it
    if nutrition_table:
        result = f"=== NUTRITION TABLE (EXTRACTED) ===\n{nutrition_table}\n\n{result}"

    # Limit total to ~150k chars to allow room for both pages
    return result[:150000]


async def extract_with_llm(
    raw_name: str,
    product_url: str,
    html_content: str,
    url_qty: float | None = None,
    url_unit: str | None = None,
    extracted_price: float | None = None,
) -> dict[str, Any]:
    """
    Use OpenAI to extract structured product data from HTML.
    Returns a dict with extracted fields.
    """
    from openai import (
        APIConnectionError,
        APITimeoutError,
        AsyncOpenAI,
        AuthenticationError,
        BadRequestError,
        InternalServerError,
        RateLimitError,
    )

    if not OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY not set, skipping LLM extraction")
        return {}

    client = AsyncOpenAI(api_key=OPENAI_API_KEY)

    # Preprocess HTML to focus on relevant sections
    processed_html = sanitize_for_llm(preprocess_html(html_content)) if html_content else ""

    # Mention extracted data in the prompt so LLM doesn't waste tokens on it
    extracted_hint = ""
    if url_qty and url_unit:
        extracted_hint += f"\n- Quantity: {url_qty} {url_unit}"
    if extracted_price:
        extracted_hint += f"\n- Price: €{extracted_price:.2f}"

    if extracted_hint:
        extracted_hint = (
            f"\n\nPRE-EXTRACTED DATA (use this data, already confirmed):{extracted_hint}"
        )

    system_prompt = f"""You are a product data extraction assistant for Belgian grocery websites (Collect&Go, Delhaize, Carrefour).

Extract structured product information and return a JSON object with these fields:

{{
  "brand": "string or null - Brand name (e.g., BONI, Delhaize, Soubry, Lu, Lotus, Coca-Cola)",
  "canonical_name": "string or null - Clean product name without brand, quantity, or promotional text",
  "category": "string or null - Use ONE of these categories:
{format_categories_bullets()}",
  "net_quantity_value": "number or null - Numeric quantity (e.g., 375.0)",
  "net_quantity_unit": "string or null - MUST BE EXACTLY ONE OF: g, kg, ml, l, tsp, tbsp, pc, pinch, dash",
  "price": "number or null - Current price as decimal (e.g., 1.89, 0.99, 12.50)",
  "currency": "string - Always EUR for Belgian sites",
  "nutrition": {{
    "energy_kcal": "number or null - Energy in kcal per 100g/100ml",
    "protein_g": "number or null - Protein in grams per 100g/100ml",
    "carbs_g": "number or null - Carbohydrates in grams per 100g/100ml",
    "sugars_g": "number or null - Sugars in grams per 100g/100ml",
    "fat_g": "number or null - Fat in grams per 100g/100ml",
    "saturated_fat_g": "number or null - Saturated fat in grams per 100g/100ml",
    "fiber_g": "number or null - Fiber in grams per 100g/100ml",
    "salt_g": "number or null - Salt in grams per 100g/100ml",
    "serving_size": "string or null - Usually '100g' or '100ml'"
  }} or null if no nutrition table found,
  "is_food": "boolean - true for edible products, false for household/pet/personal care"
}}

EXTRACTION RULES:
1. PRICE: If "PRE-EXTRACTED DATA" section shows a price, USE THAT VALUE - it was extracted directly from the DOM.
   Otherwise, look for price elements in HTML (often in spans/divs with 'price' class). Belgian sites show prices like "€1,89" or "1.89€"
2. NUTRITION:
   - If you see "=== NUTRITION TABLE (EXTRACTED) ===" at the top, use that data first - it's the clean nutrition table
   - The table is under "Valeurs nutritionelles" (French) or "Voedingswaarde" (Dutch) header
   - Look for "Par 100 g" or "Per 100 g" values
   - Common row labels: Energie/Energy (kcal), Protéines/Protein (g), Glucides/Carbohydrates (g), Sucres/Sugars (g),
     Lipides/Fat (g), Acides gras saturés/Saturated fat (g), Fibres/Fiber (g), Sel/Salt (g)
   - Extract ONLY if you find real numeric values - do NOT estimate or invent values
3. BRAND: Extract from product name or look for brand mentions
4. CANONICAL NAME: Remove brand, quantity, promotional words (BIO, PROMO, NEW, etc.)
5. CATEGORY: Choose the BEST FIT category from the list above - be specific but not overly narrow
6. QUANTITY: Look for weight/volume info (e.g., "375g", "1L", "12 stuks"). Use URL data if not in HTML
7. IS_FOOD: false only for cleaning products, pet food, diapers, cosmetics, etc.

FEW-SHOT EXAMPLES:

Example 1 - Raw: "SOUBRY Pasta Giglio Rustica 375g"
{{
  "brand": "SOUBRY",
  "canonical_name": "Pasta Giglio Rustica",
  "category": "Pasta & Rice",
  "net_quantity_value": 375.0,
  "net_quantity_unit": "g",
  "price": 0.90,
  "currency": "EUR",
  "nutrition": {{"energy_kcal": 350, "protein_g": 12.5, "carbs_g": 70.0, "sugars_g": 2.0, "fat_g": 2.5, "saturated_fat_g": 0.5, "fiber_g": 3.0, "salt_g": 0.01, "serving_size": "100g"}},
  "is_food": true
}}

Example 2 - Raw: "BONI Zonnebloempitten 280g"
{{
  "brand": "BONI",
  "canonical_name": "Zonnebloempitten",
  "category": "Snacks & Sweets",
  "net_quantity_value": 280.0,
  "net_quantity_unit": "g",
  "price": 1.49,
  "currency": "EUR",
  "nutrition": {{"energy_kcal": 584, "protein_g": 21.0, "carbs_g": 20.0, "sugars_g": 2.7, "fat_g": 51.0, "saturated_fat_g": 5.5, "fiber_g": 8.6, "salt_g": 0.01, "serving_size": "100g"}},
  "is_food": true
}}

Example 3 - Raw: "Coca-Cola Regular 12x33cl"
{{
  "brand": "Coca-Cola",
  "canonical_name": "Regular",
  "category": "Water & Soft Drinks",
  "net_quantity_value": 330.0,
  "net_quantity_unit": "ml",
  "price": 5.99,
  "currency": "EUR",
  "nutrition": null,
  "is_food": true
}}

CRITICAL:
- DO NOT invent data - use null if not clearly present
- Extract nutrition ONLY from actual nutrition tables (Voedingswaarde/Nutrition), not from product descriptions
- Convert comma decimals to period (1,89 → 1.89)
- For pieces/stuks, use unit "pc" not "pieces"
- Return valid JSON only{extracted_hint}"""

    user_prompt = f"""Product: {raw_name}
URL: {product_url}

Page Content:
{processed_html}

Extract product data as JSON following the rules and examples above."""

    async def _call_llm():
        try:
            resp = await client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.2,
                response_format={"type": "json_object"},
            )
        finally:
            await client.close()
        return resp

    try:
        response = await async_retry(
            _call_llm,
            retryable_exceptions=(
                RateLimitError,
                APITimeoutError,
                APIConnectionError,
                InternalServerError,
            ),
            non_retryable_exceptions=(AuthenticationError, BadRequestError),
            label=f"extract_with_llm({raw_name})",
        )

        extracted_data = json.loads(response.choices[0].message.content)

        if extracted_data.get("price") is not None:
            try:
                extracted_data["price"] = float(extracted_data["price"])
            except (ValueError, TypeError):
                logger.warning(f"Invalid price value: {extracted_data.get('price')}")
                extracted_data["price"] = None

        if extracted_data.get("net_quantity_value") is not None:
            try:
                extracted_data["net_quantity_value"] = float(extracted_data["net_quantity_value"])
            except (ValueError, TypeError):
                logger.warning(
                    f"Invalid quantity value: {extracted_data.get('net_quantity_value')}"
                )
                extracted_data["net_quantity_value"] = None

        if extracted_data.get("net_quantity_unit"):
            normalized_unit = normalize_unit(extracted_data["net_quantity_unit"])
            if normalized_unit:
                extracted_data["net_quantity_unit"] = normalized_unit
            else:
                logger.warning(
                    f"Invalid unit '{extracted_data['net_quantity_unit']}', setting to null"
                )
                extracted_data["net_quantity_unit"] = None

        if extracted_data.get("nutrition") and isinstance(extracted_data["nutrition"], dict):
            nutrition = extracted_data["nutrition"]
            for key in [
                "energy_kcal",
                "protein_g",
                "carbs_g",
                "sugars_g",
                "fat_g",
                "saturated_fat_g",
                "fiber_g",
                "salt_g",
            ]:
                if nutrition.get(key) is not None:
                    try:
                        nutrition[key] = float(nutrition[key])
                    except (ValueError, TypeError):
                        nutrition[key] = None

            logger.debug("LLM extracted nutrition:")
            for key, value in nutrition.items():
                if value is not None:
                    logger.debug(f"  {key}: {value}")
        else:
            logger.debug("No nutrition data extracted by LLM")

        return extracted_data

    except (AuthenticationError, BadRequestError) as e:
        logger.error(f"Non-retryable LLM error: {e}")
        return {}
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        return {}
    except Exception as e:
        logger.error(f"LLM extraction failed after retries: {e}")
        return {}


async def enrich_catalog_item(
    vendor_name: str,
    vendor_product_id: str,
    raw_name: str,
    product_url: str,
) -> CatalogItemCreate | None:
    """
    Enrich catalog item using Playwright + OpenAI LLM.
    Implements rate limiting to avoid WAF blocks.
    """
    global items_processed

    items_processed += 1

    await _pace_request()

    logger.info(f"[{items_processed}] Enriching: {raw_name} worker_location={WORKER_LOCATION}")

    # Step 1: Extract quantity/unit from URL (fast, no API calls)
    url_qty, url_unit = extract_quantity_from_url(product_url)
    if url_qty:
        logger.debug(f"URL extraction: {url_qty}{url_unit}")

    # Step 2: Crawl main product page with Playwright
    crawl = await crawl_product_page(product_url)

    if not crawl.html_content:
        logger.warning(f"Failed to crawl {product_url} — skipping DB write")
        return None

    # If redirected, try extracting quantity from final URL too
    if crawl.final_url and crawl.final_url != product_url:
        final_qty, final_unit = extract_quantity_from_url(crawl.final_url)
        if final_qty and not url_qty:
            url_qty, url_unit = final_qty, final_unit
            logger.debug(f"Final URL extraction: {url_qty}{url_unit}")

    effective_url = crawl.final_url or product_url

    # Step 3: Initial LLM extraction to determine if it's food
    logger.debug("Determining if product is food...")
    extracted_data = await extract_with_llm(
        raw_name, effective_url, crawl.html_content, url_qty, url_unit, crawl.extracted_price
    )
    is_food = extracted_data.get("is_food", True)

    # Step 4: If it's food, crawl the nutrition info page
    if is_food:
        logger.info("Product is food, crawling nutrition page...")
        detailed_html, nutrition_table_text = await crawl_nutrition_page(
            crawl.info_link_url, effective_url
        )

        if detailed_html:
            combined_html = (
                crawl.html_content + "\n\n<!-- DETAILED PRODUCT INFO PAGE -->\n" + detailed_html
            )

            if nutrition_table_text:
                combined_html = (
                    f"<!-- EXTRACTED NUTRITION TABLE -->\n{nutrition_table_text}\n\n"
                    + combined_html
                )
                logger.debug("Added nutrition table to HTML")

            logger.info("Extracting nutrition data with LLM...")
            extracted_data = await extract_with_llm(
                raw_name,
                effective_url,
                combined_html,
                url_qty,
                url_unit,
                crawl.extracted_price,
            )
        else:
            logger.warning("Could not fetch nutrition page, using main page data")
    else:
        logger.info("Product is not food, skipping nutrition crawl")

    # Step 5: Normalize extracted data (LLM data takes priority, URL data as fallback)
    canonical_name = extracted_data.get("canonical_name") or raw_name
    brand = extracted_data.get("brand")
    category = extracted_data.get("category")

    net_quantity_value = extracted_data.get("net_quantity_value") or url_qty
    net_quantity_unit = extracted_data.get("net_quantity_unit") or url_unit

    price = extracted_data.get("price") or crawl.extracted_price
    currency = extracted_data.get("currency", "EUR")
    nutrition = extracted_data.get("nutrition")

    logger.debug("Preparing to save:")
    logger.debug(f"  Brand: {brand}")
    logger.debug(f"  Category: {category}")
    logger.debug(f"  Is food: {is_food}")
    logger.debug(f"  Price: {price}")
    logger.debug(f"  Nutri-Score: {crawl.nutriscore or 'N/A'}")
    logger.debug(f"  Promotion until: {crawl.promotion_until_date or 'N/A'}")
    if nutrition:
        logger.debug(f"  Nutrition data: {len(nutrition)} fields")
        logger.debug(f"  Nutrition JSON: {json.dumps(nutrition, indent=2)}")
    else:
        logger.debug("  Nutrition data: None")

    normalized_name = None
    if canonical_name:
        normalized_name = (
            canonical_name.lower().replace(" ", "_").replace("-", "_").replace("'", "").strip("_")
        )

    final_product_url = crawl.final_url or product_url

    return CatalogItemCreate(
        vendor_name=vendor_name,
        vendor_product_id=vendor_product_id,
        raw_name=raw_name,
        product_url=final_product_url,
        canonical_name=canonical_name if canonical_name != raw_name else None,
        normalized_name=normalized_name,
        brand=brand,
        net_quantity_value=net_quantity_value,
        net_quantity_unit=net_quantity_unit,
        is_food=is_food,
        price=price,
        currency=currency,
        category=category,
        nutrition=nutrition,
        nutriscore=crawl.nutriscore,
        nutriscore_svg=crawl.nutriscore_svg,
        promotion_until_date=crawl.promotion_until_date,
        image_url=crawl.image_url,
    )


def process_item(payload: dict, ch, bus: MessagingBus):
    """
    Callback for RabbitMQ message processing.
    Enriches the item and publishes the result to the results queue.
    The snitch consumer is responsible for persisting it.
    Only processes French (/fr/) URLs to avoid duplicates.
    """
    # Skip Dutch URLs - only process French to avoid duplicates
    product_url = payload.get("product_url", "")
    if "/nl/" in product_url:
        logger.warning(f"Skipping Dutch URL: {payload.get('raw_name', 'unknown')}")
        return

    # Only process French URLs
    if "/fr/" not in product_url:
        logger.warning(f"Skipping non-French URL: {payload.get('raw_name', 'unknown')}")
        return

    vendor_product_id = payload.get("vendor_product_id", product_url.rstrip("/").split("/")[-1])

    # Run async enrichment on the persistent loop so the shared browser
    # (bound to that loop) is reused across messages instead of relaunched.
    loop = get_event_loop()

    enriched_item = loop.run_until_complete(
        enrich_catalog_item(
            raw_name=payload["raw_name"],
            vendor_name=payload["vendor_name"],
            vendor_product_id=vendor_product_id,
            product_url=product_url,
        )
    )

    if not enriched_item:
        logger.warning(f"Enrichment produced no result for {payload.get('raw_name', 'unknown')}")
        return

    result = {
        "vendor_name": payload["vendor_name"],
        "vendor_product_id": vendor_product_id,
        "raw_name": payload["raw_name"],
        "product_url": product_url,
        "enriched": enriched_item.model_dump(mode="json"),
        "worker_location": WORKER_LOCATION,
    }

    bus.publish(CATALOG_ENRICHMENT_RESULTS_QUEUE, result)

    # Safe formatting with type checking
    if enriched_item.net_quantity_value and enriched_item.net_quantity_unit:
        # Handle enum or string unit
        unit_str = (
            enriched_item.net_quantity_unit.value
            if hasattr(enriched_item.net_quantity_unit, "value")
            else enriched_item.net_quantity_unit
        )
        qty_str = f"{enriched_item.net_quantity_value}{unit_str}"
    else:
        qty_str = "N/A"

    # Handle price carefully - ensure it's a number
    if enriched_item.price is not None:
        try:
            price_str = f"€{float(enriched_item.price):.2f}"
        except (ValueError, TypeError):
            price_str = f"€{enriched_item.price} (invalid)"
    else:
        price_str = "N/A"

    category_str = enriched_item.category or "N/A"
    nutrition_str = "yes" if enriched_item.nutrition else "no"

    logger.info(
        f"Published: {enriched_item.canonical_name or enriched_item.raw_name}, "
        f"is_food={enriched_item.is_food} worker_location={WORKER_LOCATION}"
    )
    logger.info(f"{qty_str} | {price_str} | {category_str} | Nutrition: {nutrition_str}")


if __name__ == "__main__":
    if not OPENAI_API_KEY:
        logger.error("OPENAI_API_KEY environment variable not set!")
        logger.error("Set it with: export OPENAI_API_KEY='sk-...'")
        exit(1)

    logger.info(
        f"Starting enricher with OpenAI model: {OPENAI_MODEL} worker_location={WORKER_LOCATION}"
    )
    logger.info(
        f"Rate limit: target {ENRICHER_TARGET_RATE_PER_MIN} req/min "
        f"({MIN_REQUEST_INTERVAL:.1f}s min interval) per worker"
    )

    config = get_config_for_service_dependency("catalog", "enricher")
    rabbitmq_url = os.getenv("RABBITMQ_URL", config.url)

    max_retries = 10
    for attempt in range(1, max_retries + 1):
        try:
            bus = MessagingBus(rabbitmq_url)
            break
        except Exception as e:
            if attempt == max_retries:
                logger.error(f"Failed to connect to RabbitMQ after {max_retries} attempts: {e}")
                exit(1)
            logger.info(f"RabbitMQ not ready (attempt {attempt}/{max_retries}), retrying in 5s...")
            time.sleep(5)

    bus.declare_queue(CATALOG_PROCESS_ENTITY_QUEUE)
    bus.declare_queue(CATALOG_ENRICHMENT_RESULTS_QUEUE)
    bus.consume(CATALOG_PROCESS_ENTITY_QUEUE, functools.partial(process_item, bus=bus))

    def _handle_shutdown(signum, frame):
        logger.info(f"Received signal {signum}, shutting down consumer")
        bus.channel.stop_consuming()

    signal.signal(signal.SIGTERM, _handle_shutdown)
    signal.signal(signal.SIGINT, _handle_shutdown)

    try:
        bus.start()
    finally:
        shutdown_browser()
