import gzip
import io
import time
import xml.etree.ElementTree as ET
from collections.abc import Iterable
from urllib.parse import unquote

from playwright.sync_api import sync_playwright

from services.config import Vendor, get_config
from services.shared.schemas.vendor import VendorCatalogItem, VendorXMLSource

config = get_config()

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "fr-BE,fr;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
}

DELAY_BETWEEN_REQUESTS = 3


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
        try:
            yield VendorCatalogItem(
                vendor_name=vendor.name,
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
        response = page.request.get(url)
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
    except Exception as e:
        print(f"Error fetching xml from {url}: {e}")
        return None


def fetch_products_for_vendor(vendor: Vendor) -> Iterable[VendorCatalogItem]:
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent=HEADERS["User-Agent"],
                locale="fr-BE",
                timezone_id="Europe/Brussels",
            )
            page = context.new_page()
            page.add_init_script(
                "Object.defineProperty(navigator, 'webdriver', {get: () => undefined});"
            )

            print(f"  → Fetching sitemap: {vendor.url}")
            sitemap = fetch_xml_playwright(vendor.url, page)
            if not sitemap:
                browser.close()
                return []

            sources = list(parse_sitemap_sources(sitemap)) or []
            print(f"  → Found {len(sources)} product sitemap(s)")

            for source in sources:
                if not source or not source.url:
                    continue

                time.sleep(DELAY_BETWEEN_REQUESTS)
                products = fetch_xml_playwright(source.url, page)
                if not products:
                    continue

                browser.close()
                return parse_vendor_catalog_item_xml(products, vendor)

            browser.close()
    except Exception as e:
        print(f"Error fetching products for vendor {vendor.name}: {e}")
        return []
