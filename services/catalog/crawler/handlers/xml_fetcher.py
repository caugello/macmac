import gzip
import io
import re
import time
from collections.abc import Iterable
from urllib.parse import unquote

import defusedxml.ElementTree as ET

try:
    from playwright.sync_api import sync_playwright
except ImportError:  # playwright is an optional crawler/enricher extra (absent in CI)
    sync_playwright = None  # type: ignore[assignment]

from services.config import Vendor, get_config, get_config_for_service
from services.shared.lib.url_validator import validate_url
from services.shared.schemas.vendor import VendorCatalogItem, VendorXMLSource

config = get_config()
catalog_config = get_config_for_service("catalog")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "fr-BE,fr;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
}

DELAY_BETWEEN_REQUESTS = 3

# Status codes returned by collectandgo.be's WAF when it blocks a datacenter IP.
# 456 is their custom block code. Duplicated (not imported) from the enricher on
# purpose: the two are separate services (sync Playwright here, async there).
WAF_BLOCK_STATUSES = {403, 405, 456}

# Brightdata CDP "scraping browser" endpoint, read the same way the enricher does.
# When unset, the crawler runs local-only with no proxy fallback (unchanged behavior).
PROXY_URL = catalog_config.enricher.proxy_url if catalog_config.enricher else None


class WafBlocked(Exception):
    """Raised when a fetch is rejected by the vendor WAF, to trigger proxy fallback."""


def parse_vendor_catalog_item_xml(xml_content: str, vendor: Vendor) -> Iterable[VendorCatalogItem]:
    """
    Parses XML content from a vendor's catalog sitemap and yields VendorCatalogItem objects.
    """
    root = ET.fromstring(xml_content)

    for loc in root.iter("{http://www.sitemaps.org/schemas/sitemap/0.9}loc"):
        link = loc.text.strip()

        if f"{vendor.product_url_identifier}" not in link:
            continue

        slug = link.rstrip("/").split("/")[-1]
        if vendor.product_id_pattern:
            match = re.search(vendor.product_id_pattern, slug)
            vendor_product_id = match.group(1) if match else slug
        else:
            vendor_product_id = slug
        try:
            yield VendorCatalogItem(
                vendor_name=vendor.name,
                vendor_product_id=vendor_product_id,
                product_url=link,
                raw_name=unquote(slug.replace("-", " ")),
            )
        except ValueError as e:
            print(f"Error parsing product_id or raw_name from slug '{slug or None}': {e}")
            continue


def parse_sitemap_sources(xml_content: str) -> Iterable[VendorXMLSource]:
    """
    Parses XML content from a sitemap index and yields VendorXMLSource objects.
    """
    root = ET.fromstring(xml_content)

    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    for sm in root.findall("sm:sitemap", ns):
        loc = sm.find("sm:loc", ns)

        if "fr_FR-product-" not in loc.text.strip():
            continue

        try:
            yield VendorXMLSource(url=loc.text.strip())
        except ValueError as e:
            print(f"Error parsing XML sources: {e}")
            continue


def fetch_xml_playwright(url: str, page) -> str | None:
    """
    Fetches XML content from a URL using Playwright to bypass anti-bot.
    Uses page.request.get() to fetch raw content without browser rendering.
    """
    try:
        validate_url(url)
        response = page.request.get(url)
        if response.status in WAF_BLOCK_STATUSES:
            print(f"WAF block fetching {url}: HTTP {response.status}")
            raise WafBlocked(f"HTTP {response.status}")
        if response.status >= 400:
            print(f"Error fetching {url}: HTTP {response.status}")
            return None

        body = response.body()

        # Try gzip decompression; if it fails, content was already decompressed
        if url.endswith(".gz"):
            try:
                with gzip.open(io.BytesIO(body), "rt", encoding="utf-8") as f:
                    return f.read()
            except gzip.BadGzipFile:
                return body.decode("utf-8")

        return body.decode("utf-8")
    except WafBlocked:
        raise
    except Exception as e:
        print(f"Error fetching xml from {url}: {e}")
        return None


def _launch_local(p):
    """Launch a local headless Chromium browser."""
    return p.chromium.launch(
        headless=True,
        args=[
            "--disable-dev-shm-usage",
            "--no-sandbox",
            "--disable-blink-features=AutomationControlled",
        ],
    )


def _new_page(browser, use_proxy: bool):
    """Create a fresh context + page on the given browser.

    APIRequestContext (used by page.request.get) is bound to the browser context,
    so a page created on a CDP-connected browser egresses through that remote
    browser (i.e. the Brightdata endpoint).
    """
    context = browser.new_context(
        user_agent=HEADERS["User-Agent"],
        locale="fr-BE",
        timezone_id="Europe/Brussels",
    )
    page = context.new_page()
    if not use_proxy:
        page.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined});"
        )
    return page


def fetch_products_for_vendor(vendor: Vendor) -> Iterable[VendorCatalogItem]:
    try:
        with sync_playwright() as p:
            browser = _launch_local(p)
            page = _new_page(browser, use_proxy=False)
            # In-run latch: once the WAF blocks us, route the rest of this crawl
            # through the proxy. Held only for the duration of this short-lived Job;
            # no cross-run persistence (unlike the enricher's 24h hold).
            using_proxy = False

            def fetch(url: str) -> str | None:
                """Fetch via the current browser; on a WAF block, switch to the
                Brightdata proxy (if configured) and retry once through it."""
                nonlocal browser, page, using_proxy
                try:
                    return fetch_xml_playwright(url, page)
                except WafBlocked:
                    if using_proxy or not PROXY_URL:
                        # Already proxied, or no proxy available — give up on this url.
                        return None
                    print("  → WAF block detected, switching to proxy")
                    try:
                        browser.close()
                    except Exception:
                        pass
                    browser = p.chromium.connect_over_cdp(PROXY_URL)
                    page = _new_page(browser, use_proxy=True)
                    using_proxy = True
                    try:
                        return fetch_xml_playwright(url, page)
                    except WafBlocked:
                        return None

            print(f"  → Fetching sitemap: {vendor.url}")
            validate_url(vendor.url)
            sitemap = fetch(vendor.url)
            if not sitemap:
                browser.close()
                return []

            sources = list(parse_sitemap_sources(sitemap)) or []
            print(f"  → Found {len(sources)} product sitemap(s)")

            all_products: list[VendorCatalogItem] = []
            for source in sources:
                if not source or not source.url:
                    continue

                time.sleep(DELAY_BETWEEN_REQUESTS)
                products_xml = fetch(source.url)
                if not products_xml:
                    continue

                all_products.extend(parse_vendor_catalog_item_xml(products_xml, vendor))

            browser.close()
            return all_products
    except Exception as e:
        print(f"Error fetching products for vendor {vendor.name}: {e}")
        return []
