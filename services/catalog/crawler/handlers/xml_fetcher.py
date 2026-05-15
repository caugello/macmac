import gzip
import io
import time
import xml.etree.ElementTree as ET
from collections.abc import Iterable
from urllib.parse import unquote

import httpx

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


def fetch_xml(url: str, client: httpx.Client) -> str | None:
    """
    Fetches XML content from a given URL, handling gzipped content if necessary.
    Uses an existing client session to maintain cookies across requests.
    """
    try:
        response = client.get(url)
        response.raise_for_status()

        if url.endswith(".gz"):
            gzipped_file = io.BytesIO(response.content)
            with gzip.open(gzipped_file, "rt", encoding="utf-8") as f:
                xml_content = f.read()
        else:
            xml_content = response.text

        return xml_content

    except httpx.RequestError as e:
        print(f"Error fetching xml from {url}: {e}")
        return None


def warm_up_session(client: httpx.Client, base_url: str) -> None:
    """Visit the homepage first to establish cookies and a valid session."""
    try:
        print(f"  → Warming up session on {base_url}")
        response = client.get(base_url)
        if response.status_code == 200:
            print("  → Session established")
        time.sleep(DELAY_BETWEEN_REQUESTS)
    except httpx.RequestError as e:
        print(f"  → Warning: could not warm up session: {e}")


def fetch_products_for_vendor(vendor: Vendor) -> Iterable[VendorCatalogItem]:
    try:
        with httpx.Client(
            headers=HEADERS,
            follow_redirects=True,
            timeout=30.0,
        ) as client:
            base_url = vendor.url.rsplit("/", 1)[0]
            warm_up_session(client, base_url)

            sitemap = fetch_xml(vendor.url, client)
            sources = parse_sitemap_sources(sitemap) or []
            for source in sources:
                if not source or not source.url:
                    continue

                time.sleep(DELAY_BETWEEN_REQUESTS)
                products = fetch_xml(source.url, client)
                if not products:
                    continue

                return parse_vendor_catalog_item_xml(products, vendor)
    except Exception as e:
        print(f"Error fetching products for vendor {vendor.name}: {e}")
        return []
