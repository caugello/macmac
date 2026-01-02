import gzip
import io
import xml.etree.ElementTree as ET
from typing import Iterable
from urllib.parse import unquote

import httpx

from services.config import Vendor, get_config, get_config_for_vendor
from services.shared.schemas.vendor import VendorCatalogItem, VendorXMLSource

config = get_config()

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
}


def parse_vendor_catalog_item_xml(
    xml_content: str, vendor: Vendor
) -> Iterable[VendorCatalogItem]:
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
            print(
                f"Error parsing product_id or raw_name from slug '{slug or None}': {e}"
            )
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


def fetch_xml(url):
    """
    Fetches XML content from a given URL, handling gzipped content if necessary.
    """
    try:
        with httpx.Client(headers=headers) as client:
            response = client.get(url)
            response.raise_for_status()  # Raise an exception for HTTP errors (4xx or 5xx)

            # Check if the content is gzipped
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


def fetch_products_for_vendor(vendor: Vendor) -> Iterable[VendorCatalogItem]:
    try:
        sitemap = fetch_xml(vendor.url)
        sources = parse_sitemap_sources(sitemap) or []
        for source in sources:
            if not source or not source.url:
                continue

            products = fetch_xml(source.url)
            if not products:
                continue

            return parse_vendor_catalog_item_xml(products, vendor)
    except Exception as e:
        print(f"Error fetching products for vendor {vendor.name}: {e}")
        return []
