"""HTTP-level integration tests for the catalog service.

Catalog is a public read API: ``list_catalog_items`` never calls
``require_user_context()``, so authenticated and anonymous requests are treated
identically. These tests verify that the framework actually extracts each
``query_params`` entry from ``config.yaml`` and that it reaches the SQL query.
"""

import pytest

from .conftest import run_async


def _create(catalog_db, **overrides):
    from services.catalog.crud import create_catalog_item
    from services.shared.schemas.catalog import CatalogItemCreate

    defaults = {
        "vendor_name": "test",
        "vendor_product_id": f"vp-{overrides.get('raw_name', 'x')}",
        "raw_name": "Apple",
        "normalized_name": "apple",
        "product_url": "https://example.com/apple",
        "is_food": True,
    }
    defaults.update(overrides)
    return run_async(create_catalog_item(CatalogItemCreate(**defaults), catalog_db))


@pytest.mark.integration
class TestCatalogQueryParams:
    """Verify the framework extracts and passes the declared catalog query_params."""

    def test_is_food_filter_applied(self, catalog_client, catalog_db, auth_headers_a):
        """is_food must be extracted by the framework and reach the DB query."""
        _create(
            catalog_db,
            raw_name="Apple",
            normalized_name="apple",
            product_url="https://example.com/apple",
            vendor_product_id="vp-apple",
            is_food=True,
        )
        _create(
            catalog_db,
            raw_name="Shampoo",
            normalized_name="shampoo",
            product_url="https://example.com/shampoo",
            vendor_product_id="vp-shampoo",
            is_food=False,
        )

        resp = catalog_client.get("/catalog?is_food=true", headers=auth_headers_a)
        assert resp.status_code == 200
        items = resp.json()["data"]
        assert len(items) == 1
        assert items[0]["is_food"] is True
        assert items[0]["raw_name"] == "Apple"

    def test_search_matches_canonical_name(self, catalog_client, catalog_db, auth_headers_a):
        """search must match against canonical_name (ILIKE on Postgres)."""
        _create(
            catalog_db,
            raw_name="Pates Giglio De Cecco 500g",
            normalized_name="pates_giglio",
            canonical_name="Pates Giglio",
            product_url="https://example.com/pasta",
            vendor_product_id="vp-pasta",
            is_food=True,
        )
        _create(
            catalog_db,
            raw_name="Olive Oil",
            normalized_name="olive_oil",
            canonical_name="Olive Oil",
            product_url="https://example.com/oil",
            vendor_product_id="vp-oil",
            is_food=True,
        )

        resp = catalog_client.get("/catalog?search=Giglio", headers=auth_headers_a)
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 1
        assert body["data"][0]["canonical_name"] == "Pates Giglio"

    def test_limit_applied(self, catalog_client, catalog_db, auth_headers_a):
        """limit must cap the number of returned rows."""
        for i in range(5):
            _create(
                catalog_db,
                raw_name=f"Item {i}",
                normalized_name=f"item_{i}",
                product_url=f"https://example.com/item-{i}",
                vendor_product_id=f"vp-item-{i}",
                is_food=True,
            )

        resp = catalog_client.get("/catalog?limit=2", headers=auth_headers_a)
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["data"]) == 2
        assert body["total"] == 5  # total reflects the full match count, not the page

    def test_catalog_is_public(self, catalog_client, catalog_db):
        """Catalog has no ownership filter, so anonymous reads succeed (200).

        This documents the real auth model: unlike recipes/meal-plans, the
        catalog list handler never calls require_user_context(). The 401 path is
        covered in test_recipes_api.py where auth is actually enforced.
        """
        _create(
            catalog_db,
            raw_name="Public Item",
            normalized_name="public_item",
            product_url="https://example.com/public",
            vendor_product_id="vp-public",
            is_food=True,
        )

        resp = catalog_client.get("/catalog")
        assert resp.status_code == 200
        assert resp.json()["total"] == 1
