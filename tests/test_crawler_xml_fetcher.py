"""Tests for the crawler XML fetcher proxy fallback."""

from unittest.mock import MagicMock

import pytest

from services.catalog.crawler.handlers import xml_fetcher
from services.catalog.crawler.handlers.xml_fetcher import (
    WafBlocked,
    _parse_forward_proxy,
    fetch_products_for_vendor,
    fetch_xml_playwright,
)
from services.config import Vendor

SITEMAP_INDEX = (
    '<?xml version="1.0" encoding="UTF-8"?>'
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    "<sitemap><loc>https://shop.example.com/sitemap-fr_FR-product-1.xml.gz</loc></sitemap>"
    "</sitemapindex>"
)

PRODUCT_SITEMAP = (
    '<?xml version="1.0" encoding="UTF-8"?>'
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    "<url><loc>https://shop.example.com/p/some-product-12345</loc></url>"
    "</urlset>"
)

# Parsed form of "http://user:pass@proxy.example.com:8080".
PROXY = {
    "server": "http://proxy.example.com:8080",
    "username": "user",
    "password": "pass",
}


@pytest.fixture(autouse=True)
def _skip_url_validation(monkeypatch):
    """Bypass DNS-resolving SSRF validation; the proxy logic is what's under test."""
    monkeypatch.setattr(xml_fetcher, "validate_url", lambda *_: None)


def _vendor() -> Vendor:
    return Vendor(
        name="testvendor",
        url="https://shop.example.com/sitemap.xml",
        product_url_identifier="/p/",
        product_id_pattern=r"(\d+)$",
    )


def _response(status: int, body: bytes = b"") -> MagicMock:
    resp = MagicMock()
    resp.status = status
    resp.body.return_value = body
    return resp


# ===== _parse_forward_proxy =====


@pytest.mark.unit
def test_parse_forward_proxy_none():
    assert _parse_forward_proxy(None) is None
    assert _parse_forward_proxy("") is None


@pytest.mark.unit
def test_parse_forward_proxy_with_credentials():
    assert _parse_forward_proxy("http://user:pass@proxy.example.com:8080") == PROXY


@pytest.mark.unit
def test_parse_forward_proxy_url_decodes_credentials():
    parsed = _parse_forward_proxy("http://u%40ser:p%40ss@proxy.example.com:8080")
    assert parsed == {
        "server": "http://proxy.example.com:8080",
        "username": "u@ser",
        "password": "p@ss",
    }


# ===== fetch_xml_playwright: WAF status raises =====


@pytest.mark.unit
def test_fetch_xml_playwright_raises_on_waf_block():
    page = MagicMock()
    page.request.get.return_value = _response(456)
    with pytest.raises(WafBlocked):
        fetch_xml_playwright("https://shop.example.com/x.xml", page)


@pytest.mark.unit
def test_fetch_xml_playwright_returns_none_on_non_waf_error():
    page = MagicMock()
    page.request.get.return_value = _response(500)
    assert fetch_xml_playwright("https://shop.example.com/x.xml", page) is None


@pytest.mark.unit
def test_fetch_xml_playwright_returns_body_on_success():
    page = MagicMock()
    page.request.get.return_value = _response(200, SITEMAP_INDEX.encode("utf-8"))
    result = fetch_xml_playwright("https://shop.example.com/sitemap.xml", page)
    assert result == SITEMAP_INDEX


# ===== fetch_products_for_vendor: proxy fallback latch =====


def _fake_playwright(local_pages, proxy_pages):
    """Build a sync_playwright() context manager whose chromium.launch returns a
    local browser (handing out `local_pages`) on the first call and a
    proxy-launched browser (handing out `proxy_pages`) on the second.

    The forward-proxy fallback relaunches a LOCAL Chromium with proxy kwargs, so
    both browsers come from chromium.launch — the proxy one is identified by the
    `proxy=` kwarg, not by connect_over_cdp.
    """
    p = MagicMock()

    local_browser = MagicMock()
    local_browser.new_context.return_value.new_page.side_effect = local_pages

    proxy_browser = MagicMock()
    proxy_browser.new_context.return_value.new_page.side_effect = proxy_pages

    p.chromium.launch.side_effect = [local_browser, proxy_browser]

    cm = MagicMock()
    cm.__enter__.return_value = p
    cm.__exit__.return_value = False
    return cm, p


@pytest.mark.unit
def test_waf_block_flips_to_proxy(monkeypatch):
    """A 456 from the local browser must relaunch Chromium with the proxy dict
    and retry the fetch through it."""
    monkeypatch.setattr(xml_fetcher, "FORWARD_PROXY", PROXY)
    monkeypatch.setattr(xml_fetcher.time, "sleep", lambda *_: None)

    # Local page: first fetch (the index sitemap) is WAF-blocked.
    local_page = MagicMock()
    local_page.request.get.return_value = _response(456)

    # Proxy page: serves the index, then the product sitemap.
    proxy_page = MagicMock()
    proxy_page.request.get.side_effect = [
        _response(200, SITEMAP_INDEX.encode("utf-8")),
        _response(200, PRODUCT_SITEMAP.encode("utf-8")),
    ]

    cm, p = _fake_playwright([local_page], [proxy_page])
    monkeypatch.setattr(xml_fetcher, "sync_playwright", lambda: cm)

    products = list(fetch_products_for_vendor(_vendor()))

    # Two launches: the initial local one, then the proxy relaunch with proxy kwargs.
    assert p.chromium.launch.call_count == 2
    p.chromium.connect_over_cdp.assert_not_called()
    assert p.chromium.launch.call_args_list[1].kwargs["proxy"] == PROXY
    assert len(products) == 1
    assert products[0].vendor_product_id == "12345"


@pytest.mark.unit
def test_no_proxy_url_stays_local(monkeypatch):
    """Without a forward proxy, a WAF block yields nothing and never relaunches."""
    monkeypatch.setattr(xml_fetcher, "FORWARD_PROXY", None)
    monkeypatch.setattr(xml_fetcher.time, "sleep", lambda *_: None)

    local_page = MagicMock()
    local_page.request.get.return_value = _response(456)

    cm, p = _fake_playwright([local_page], [MagicMock()])
    monkeypatch.setattr(xml_fetcher, "sync_playwright", lambda: cm)

    products = list(fetch_products_for_vendor(_vendor()))

    # Only the initial local launch; no proxy relaunch.
    assert p.chromium.launch.call_count == 1
    p.chromium.connect_over_cdp.assert_not_called()
    assert products == []


@pytest.mark.unit
def test_proxy_latch_holds_for_remainder_of_run(monkeypatch):
    """Once switched to proxy, later fetches must not relaunch the proxy again."""
    monkeypatch.setattr(xml_fetcher, "FORWARD_PROXY", PROXY)
    monkeypatch.setattr(xml_fetcher.time, "sleep", lambda *_: None)

    index_two_sources = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        "<sitemap><loc>https://shop.example.com/sitemap-fr_FR-product-1.xml.gz</loc></sitemap>"
        "<sitemap><loc>https://shop.example.com/sitemap-fr_FR-product-2.xml.gz</loc></sitemap>"
        "</sitemapindex>"
    )

    local_page = MagicMock()
    local_page.request.get.return_value = _response(456)

    proxy_page = MagicMock()
    proxy_page.request.get.side_effect = [
        _response(200, index_two_sources.encode("utf-8")),
        _response(200, PRODUCT_SITEMAP.encode("utf-8")),
        _response(200, PRODUCT_SITEMAP.encode("utf-8")),
    ]

    cm, p = _fake_playwright([local_page], [proxy_page])
    monkeypatch.setattr(xml_fetcher, "sync_playwright", lambda: cm)

    products = list(fetch_products_for_vendor(_vendor()))

    # Launched exactly twice (local + one proxy relaunch) even though three
    # fetches ran through the proxy.
    assert p.chromium.launch.call_count == 2
    assert len(products) == 2


@pytest.mark.unit
def test_no_block_stays_on_local_browser(monkeypatch):
    """A clean run never relaunches through the proxy."""
    monkeypatch.setattr(xml_fetcher, "FORWARD_PROXY", PROXY)
    monkeypatch.setattr(xml_fetcher.time, "sleep", lambda *_: None)

    local_page = MagicMock()
    local_page.request.get.side_effect = [
        _response(200, SITEMAP_INDEX.encode("utf-8")),
        _response(200, PRODUCT_SITEMAP.encode("utf-8")),
    ]

    cm, p = _fake_playwright([local_page], [MagicMock()])
    monkeypatch.setattr(xml_fetcher, "sync_playwright", lambda: cm)

    products = list(fetch_products_for_vendor(_vendor()))

    assert p.chromium.launch.call_count == 1
    p.chromium.connect_over_cdp.assert_not_called()
    assert len(products) == 1
