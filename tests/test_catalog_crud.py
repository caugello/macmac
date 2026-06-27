"""Tests for catalog CRUD operations."""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from fastapi import HTTPException

from services.catalog.crud import (
    create_catalog_item,
    get_catalog_item,
    get_catalog_stats,
    list_catalog_items,
)
from services.catalog.models import CatalogItem
from services.shared.schemas.catalog import CatalogItemCreate


@pytest.mark.asyncio
@pytest.mark.unit
async def test_create_catalog_item(mock_catalog_db):
    """Test creating a new catalog item."""
    item_data = CatalogItemCreate(
        vendor_name="test_vendor",
        vendor_product_id="test-product",
        raw_name="Test Product 100g",
        normalized_name="test product 100g",
        canonical_name="Test Product",
        brand="TestBrand",
        net_quantity_value=100.0,
        net_quantity_unit="g",
        product_url="https://example.com/products/test-product",
        is_food=True,
    )

    result = await create_catalog_item(item_data, mock_catalog_db)

    assert result.vendor_name == "test_vendor"
    assert result.raw_name == "Test Product 100g"
    assert result.normalized_name == "test product 100g"
    assert result.canonical_name == "Test Product"
    assert result.brand == "TestBrand"
    assert result.net_quantity_value == 100.0
    assert result.net_quantity_unit == "g"
    assert result.product_url == "https://example.com/products/test-product"
    assert result.is_food is True
    assert result.id is not None


@pytest.mark.asyncio
@pytest.mark.unit
async def test_create_catalog_item_sanitizes_nutriscore_svg(mock_catalog_db):
    """Stored nutriscore_svg is sanitized of XSS payloads."""
    item_data = CatalogItemCreate(
        vendor_name="test_vendor",
        vendor_product_id="svg",
        raw_name="SVG Product",
        product_url="https://example.com/products/svg",
        is_food=True,
        nutriscore_svg='<svg class="ns"><script>alert(1)</script><path/></svg>',
    )

    result = await create_catalog_item(item_data, mock_catalog_db)

    assert result.nutriscore_svg is not None
    assert "<script" not in result.nutriscore_svg
    assert "alert" not in result.nutriscore_svg
    assert "<svg" in result.nutriscore_svg


@pytest.mark.asyncio
@pytest.mark.unit
async def test_create_catalog_item_minimal(mock_catalog_db):
    """Test creating a catalog item with minimal required fields."""
    item_data = CatalogItemCreate(
        vendor_name="test_vendor",
        vendor_product_id="simple",
        raw_name="Simple Product",
        product_url="https://example.com/products/simple",
        is_food=False,
    )

    result = await create_catalog_item(item_data, mock_catalog_db)

    assert result.vendor_name == "test_vendor"
    assert result.raw_name == "Simple Product"
    assert result.product_url == "https://example.com/products/simple"
    assert result.is_food is False
    assert result.canonical_name is None
    assert result.brand is None


@pytest.mark.asyncio
@pytest.mark.unit
async def test_create_catalog_item_duplicate_vendor_product_id(mock_catalog_db):
    """Test that creating an item with duplicate (vendor_name, vendor_product_id) raises error."""
    item_data = CatalogItemCreate(
        vendor_name="test_vendor",
        vendor_product_id="duplicate",
        raw_name="Product A",
        product_url="https://example.com/products/duplicate",
        is_food=True,
    )

    await create_catalog_item(item_data, mock_catalog_db)

    # Try to create another with same vendor_product_id
    duplicate_data = CatalogItemCreate(
        vendor_name="test_vendor",
        vendor_product_id="duplicate",
        raw_name="Product B",
        product_url="https://example.com/products/duplicate-2",
        is_food=True,
    )

    with pytest.raises(HTTPException) as exc_info:
        await create_catalog_item(duplicate_data, mock_catalog_db)

    assert exc_info.value.status_code == 400
    assert "already exists" in str(exc_info.value.detail)


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_catalog_items_empty(mock_catalog_db):
    """Test listing catalog items when database is empty."""
    result = await list_catalog_items(mock_catalog_db)

    assert result["total"] == 0
    assert result["limit"] == 20
    assert result["offset"] == 0
    assert len(result["data"]) == 0


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_catalog_items_with_data(mock_catalog_db):
    """Test listing catalog items with pagination."""
    # Create test items
    for i in range(5):
        item_data = CatalogItemCreate(
            vendor_name="test_vendor",
            vendor_product_id=f"product-{i}",
            raw_name=f"Product {i}",
            product_url=f"https://example.com/products/product-{i}",
            is_food=True,
        )
        await create_catalog_item(item_data, mock_catalog_db)

    # List all items
    result = await list_catalog_items(mock_catalog_db, limit=10, offset=0)

    assert result["total"] == 5
    assert len(result["data"]) == 5


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_catalog_items_pagination(mock_catalog_db):
    """Test pagination of catalog items."""
    # Create 10 items
    for i in range(10):
        item_data = CatalogItemCreate(
            vendor_name="test_vendor",
            vendor_product_id=f"product-{i}",
            raw_name=f"Product {i}",
            product_url=f"https://example.com/products/product-{i}",
            is_food=True,
        )
        await create_catalog_item(item_data, mock_catalog_db)

    # Get first page
    page1 = await list_catalog_items(mock_catalog_db, limit=5, offset=0)
    assert len(page1["data"]) == 5
    assert page1["total"] == 10

    # Get second page
    page2 = await list_catalog_items(mock_catalog_db, limit=5, offset=5)
    assert len(page2["data"]) == 5
    assert page2["total"] == 10


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_catalog_items_with_search(mock_catalog_db):
    """Test searching catalog items by normalized name."""
    # Create items
    await create_catalog_item(
        CatalogItemCreate(
            vendor_name="test_vendor",
            vendor_product_id="chocolate",
            raw_name="Chocolate Bar",
            normalized_name="chocolate bar",
            product_url="https://example.com/products/chocolate",
            is_food=True,
        ),
        mock_catalog_db,
    )
    await create_catalog_item(
        CatalogItemCreate(
            vendor_name="test_vendor",
            vendor_product_id="vanilla",
            raw_name="Vanilla Ice Cream",
            normalized_name="vanilla ice cream",
            product_url="https://example.com/products/vanilla",
            is_food=True,
        ),
        mock_catalog_db,
    )

    # Search for chocolate
    result = await list_catalog_items(mock_catalog_db, search="chocolate")

    assert result["total"] == 1
    assert result["data"][0].raw_name == "Chocolate Bar"


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_catalog_items_search_case_insensitive(mock_catalog_db):
    """Test that search is case-insensitive."""
    await create_catalog_item(
        CatalogItemCreate(
            vendor_name="test_vendor",
            vendor_product_id="milk",
            raw_name="Organic Milk",
            normalized_name="organic milk",
            product_url="https://example.com/products/milk",
            is_food=True,
        ),
        mock_catalog_db,
    )

    # Search with different cases
    result_lower = await list_catalog_items(mock_catalog_db, search="milk")
    result_upper = await list_catalog_items(mock_catalog_db, search="MILK")
    result_mixed = await list_catalog_items(mock_catalog_db, search="MiLk")

    assert result_lower["total"] == 1
    assert result_upper["total"] == 1
    assert result_mixed["total"] == 1


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_catalog_items_search_matches_brand(mock_catalog_db):
    """Search matches the brand field even when it is absent from normalized_name."""
    # Mirrors the enricher behaviour: brand stripped out of normalized_name.
    await create_catalog_item(
        CatalogItemCreate(
            vendor_name="test_vendor",
            vendor_product_id="coke-zero",
            raw_name="Coca Cola Zero Sugar 33cl",
            normalized_name="zero_sugar",
            canonical_name="Zero Sugar",
            brand="Coca-Cola",
            product_url="https://example.com/products/coke-zero",
            is_food=True,
        ),
        mock_catalog_db,
    )
    await create_catalog_item(
        CatalogItemCreate(
            vendor_name="test_vendor",
            vendor_product_id="water",
            raw_name="Sparkling Water",
            normalized_name="sparkling_water",
            brand="AquaPure",
            product_url="https://example.com/products/water",
            is_food=True,
        ),
        mock_catalog_db,
    )

    result = await list_catalog_items(mock_catalog_db, search="coca")

    assert result["total"] == 1
    assert result["data"][0].brand == "Coca-Cola"


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_catalog_items_search_matches_raw_name(mock_catalog_db):
    """Search matches raw_name even when normalized_name does not contain the term."""
    await create_catalog_item(
        CatalogItemCreate(
            vendor_name="test_vendor",
            vendor_product_id="boni-ketchup",
            raw_name="Boni Selection Tomato Ketchup",
            normalized_name="tomato_ketchup",
            canonical_name="Tomato Ketchup",
            brand="Boni",
            product_url="https://example.com/products/boni-ketchup",
            is_food=True,
        ),
        mock_catalog_db,
    )

    # "selection" only appears in raw_name.
    result = await list_catalog_items(mock_catalog_db, search="selection")

    assert result["total"] == 1
    assert result["data"][0].raw_name == "Boni Selection Tomato Ketchup"


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_catalog_items_search_matches_brand_case_insensitive(mock_catalog_db):
    """Brand search is case-insensitive (e.g. 'boni' matches brand 'Boni')."""
    await create_catalog_item(
        CatalogItemCreate(
            vendor_name="test_vendor",
            vendor_product_id="boni-apple",
            raw_name="Boni Apple Juice 1L",
            normalized_name="apple_juice",
            canonical_name="Apple Juice",
            brand="Boni",
            product_url="https://example.com/products/boni-apple",
            is_food=True,
        ),
        mock_catalog_db,
    )

    result = await list_catalog_items(mock_catalog_db, search="boni")

    assert result["total"] == 1
    assert result["data"][0].brand == "Boni"


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_catalog_items_search_matches_canonical_name(mock_catalog_db):
    """Search matches canonical_name — the name displayed in the UI."""
    await create_catalog_item(
        CatalogItemCreate(
            vendor_name="test_vendor",
            vendor_product_id="pasta-giglio",
            raw_name="Pâtes Giglio Rustica De Cecco 500 g",
            normalized_name="pates_giglio_rustica",
            canonical_name="Pâtes Giglio Rustica",
            brand="De Cecco",
            product_url="https://example.com/products/pasta-giglio",
            is_food=True,
        ),
        mock_catalog_db,
    )

    result = await list_catalog_items(mock_catalog_db, search="Giglio Rustica")

    assert result["total"] == 1
    assert result["data"][0].canonical_name == "Pâtes Giglio Rustica"


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_catalog_items_search_no_match(mock_catalog_db):
    """Search returns nothing when the term matches no searchable field."""
    await create_catalog_item(
        CatalogItemCreate(
            vendor_name="test_vendor",
            vendor_product_id="coke-zero",
            raw_name="Coca Cola Zero Sugar 33cl",
            normalized_name="zero_sugar",
            canonical_name="Zero Sugar",
            brand="Coca-Cola",
            product_url="https://example.com/products/coke-zero",
            is_food=True,
        ),
        mock_catalog_db,
    )

    result = await list_catalog_items(mock_catalog_db, search="pepsi")

    assert result["total"] == 0


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_catalog_items_with_sort(mock_catalog_db):
    """Test sorting catalog items."""
    # Create items in random order
    await create_catalog_item(
        CatalogItemCreate(
            vendor_name="test_vendor",
            vendor_product_id="zebra",
            raw_name="Zebra Cookies",
            normalized_name="zebra cookies",
            product_url="https://example.com/products/zebra",
            is_food=True,
        ),
        mock_catalog_db,
    )
    await create_catalog_item(
        CatalogItemCreate(
            vendor_name="test_vendor",
            vendor_product_id="apple",
            raw_name="Apple Juice",
            normalized_name="apple juice",
            product_url="https://example.com/products/apple",
            is_food=True,
        ),
        mock_catalog_db,
    )

    # Sort ascending
    result_asc = await list_catalog_items(mock_catalog_db, sort="raw_name:asc")
    assert result_asc["data"][0].raw_name == "Apple Juice"
    assert result_asc["data"][1].raw_name == "Zebra Cookies"

    # Sort descending
    result_desc = await list_catalog_items(mock_catalog_db, sort="raw_name:desc")
    assert result_desc["data"][0].raw_name == "Zebra Cookies"
    assert result_desc["data"][1].raw_name == "Apple Juice"


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_catalog_items_invalid_sort(mock_catalog_db):
    """Test that invalid sort parameter raises error."""
    with pytest.raises(HTTPException) as exc_info:
        await list_catalog_items(mock_catalog_db, sort="invalid_sort")

    assert exc_info.value.status_code == 400
    assert "Invalid sort value" in str(exc_info.value.detail)


@pytest.mark.asyncio
@pytest.mark.unit
async def test_get_catalog_item(mock_catalog_db):
    """Test getting a catalog item by ID."""
    # Create an item
    created = await create_catalog_item(
        CatalogItemCreate(
            vendor_name="test_vendor",
            vendor_product_id="test",
            raw_name="Test Product",
            product_url="https://example.com/products/test",
            is_food=True,
        ),
        mock_catalog_db,
    )

    # Get it back
    result = await get_catalog_item(created.id, mock_catalog_db)

    assert result.id == created.id
    assert result.raw_name == "Test Product"
    assert result.vendor_name == "test_vendor"


@pytest.mark.asyncio
@pytest.mark.unit
async def test_get_catalog_item_not_found(mock_catalog_db):
    """Test getting a non-existent catalog item raises 404."""
    fake_id = uuid.uuid4()

    with pytest.raises(HTTPException) as exc_info:
        await get_catalog_item(fake_id, mock_catalog_db)

    assert exc_info.value.status_code == 404
    assert "not found" in str(exc_info.value.detail).lower()


@pytest.mark.asyncio
@pytest.mark.unit
async def test_catalog_item_timestamps(mock_catalog_db):
    """Test that created_at and updated_at timestamps are set."""
    item_data = CatalogItemCreate(
        vendor_name="test_vendor",
        vendor_product_id="timestamp",
        raw_name="Timestamped Product",
        product_url="https://example.com/products/timestamp",
        is_food=True,
    )

    result = await create_catalog_item(item_data, mock_catalog_db)

    assert result.created_at is not None
    assert result.updated_at is not None


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_catalog_items_invalid_sort_direction(mock_catalog_db):
    """Test that invalid sort direction raises error."""
    await create_catalog_item(
        CatalogItemCreate(
            vendor_name="test_vendor",
            vendor_product_id="test",
            raw_name="Test Product",
            product_url="https://example.com/products/test",
            is_food=True,
        ),
        mock_catalog_db,
    )

    # Try invalid sort direction
    with pytest.raises(HTTPException) as exc_info:
        await list_catalog_items(mock_catalog_db, sort="raw_name:invalid")

    assert exc_info.value.status_code == 400
    assert "Invalid sort value" in str(exc_info.value.detail)


# ===== UNIT TESTS - is_food filter =====


async def _seed_food_and_nonfood(db):
    """Helper: seed 3 food + 2 non-food items."""
    foods = [
        ("Milk 1L", "milk", "https://example.com/milk", True, "Dairy"),
        ("Bread", "bread", "https://example.com/bread", True, "Bakery"),
        ("Cheese", "cheese", "https://example.com/cheese", True, "Dairy"),
        ("Dish Soap", "soap", "https://example.com/soap", False, "Household"),
        ("Sponge 3pc", "sponge", "https://example.com/sponge", False, "Household"),
    ]
    for name, pid, url, is_food, cat in foods:
        await create_catalog_item(
            CatalogItemCreate(
                vendor_name="test_vendor",
                vendor_product_id=pid,
                raw_name=name,
                normalized_name=name.lower(),
                product_url=url,
                is_food=is_food,
                category=cat,
            ),
            db,
        )


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_catalog_items_filter_food_only(mock_catalog_db):
    """is_food=True returns only food items."""
    await _seed_food_and_nonfood(mock_catalog_db)
    result = await list_catalog_items(mock_catalog_db, is_food=True)
    assert result["total"] == 3
    assert all(item.is_food is True for item in result["data"])


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_catalog_items_filter_nonfood_only(mock_catalog_db):
    """is_food=False returns only non-food items."""
    await _seed_food_and_nonfood(mock_catalog_db)
    result = await list_catalog_items(mock_catalog_db, is_food=False)
    assert result["total"] == 2
    assert all(item.is_food is False for item in result["data"])


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_catalog_items_no_food_filter(mock_catalog_db):
    """No is_food filter returns all items."""
    await _seed_food_and_nonfood(mock_catalog_db)
    result = await list_catalog_items(mock_catalog_db)
    assert result["total"] == 5


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_catalog_items_food_filter_with_search(mock_catalog_db):
    """is_food combined with search filters correctly."""
    await _seed_food_and_nonfood(mock_catalog_db)
    result = await list_catalog_items(mock_catalog_db, search="soap", is_food=False)
    assert result["total"] == 1
    assert result["data"][0].raw_name == "Dish Soap"


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_catalog_items_food_filter_with_category(mock_catalog_db):
    """is_food combined with category filters correctly."""
    await _seed_food_and_nonfood(mock_catalog_db)
    result = await list_catalog_items(mock_catalog_db, category="Dairy", is_food=True)
    assert result["total"] == 2


# ===== UNIT TESTS - enrichment-coverage stats =====


def _make_stats_item(db, vendor_product_id, **overrides):
    """Insert a CatalogItem directly so last_enriched_at / field presence are
    controlled precisely (the CRUD create path does not stamp enrichment time)."""
    fields = {
        "vendor_name": "test_vendor",
        "vendor_product_id": vendor_product_id,
        "raw_name": f"Product {vendor_product_id}",
        "product_url": f"https://example.com/products/{vendor_product_id}",
        "is_food": True,
        "price": 1.99,
        "image_url": "https://example.com/img.jpg",
        "nutrition": {"energy_kcal": 100},
        "nutriscore": "A",
        "last_enriched_at": datetime.now(UTC),
    }
    fields.update(overrides)
    # nutrition uses none_as_null=True, so an explicit None persists as SQL NULL
    # (the convention requeue_stale and the stats counts query with .is_(None)).
    item = CatalogItem(**fields)
    db.add(item)
    db.commit()
    return item


@pytest.mark.unit
def test_nutrition_none_persists_as_sql_null(mock_catalog_db):
    """Regression (#363): an explicit nutrition=None must persist as SQL NULL,
    not JSON 'null'. Otherwise the requeue backfill and stats counts (which test
    nutrition IS NULL) miss the row and a food item stays stuck without nutrition.
    """
    food = CatalogItem(
        vendor_name="test_vendor",
        vendor_product_id="explicit-none",
        raw_name="Explicit None",
        product_url="https://example.com/products/explicit-none",
        is_food=True,
        price=1.99,
        image_url="https://example.com/img.jpg",
        nutrition=None,
        last_enriched_at=datetime.now(UTC),
    )
    mock_catalog_db.add(food)
    mock_catalog_db.commit()

    null_count = mock_catalog_db.query(CatalogItem).filter(CatalogItem.nutrition.is_(None)).count()
    assert null_count == 1


@pytest.mark.asyncio
@pytest.mark.unit
async def test_catalog_stats_empty(mock_catalog_db):
    """Empty catalog reports zero across every bucket."""
    stats = await get_catalog_stats(mock_catalog_db)
    assert stats.total == 0
    assert stats.fresh == 0
    assert stats.stale == 0
    assert stats.missing_image_url == 0
    assert stats.missing_nutrition == 0
    assert stats.missing_nutriscore == 0


@pytest.mark.asyncio
@pytest.mark.unit
async def test_catalog_stats_fresh_complete_food(mock_catalog_db):
    """A recently-enriched, complete food item counts as fresh."""
    _make_stats_item(mock_catalog_db, "fresh-food")
    stats = await get_catalog_stats(mock_catalog_db)
    assert stats.total == 1
    assert stats.fresh == 1
    assert stats.stale == 0
    assert stats.missing_image_url == 0
    assert stats.missing_nutrition == 0
    assert stats.missing_nutriscore == 0


@pytest.mark.asyncio
@pytest.mark.unit
async def test_catalog_stats_stale_when_old(mock_catalog_db):
    """A complete item enriched outside the freshness window is stale, not fresh."""
    _make_stats_item(
        mock_catalog_db, "old", last_enriched_at=datetime.now(UTC) - timedelta(days=20)
    )
    stats = await get_catalog_stats(mock_catalog_db)
    assert stats.total == 1
    assert stats.fresh == 0
    assert stats.stale == 1


@pytest.mark.asyncio
@pytest.mark.unit
async def test_catalog_stats_never_enriched_is_stale(mock_catalog_db):
    """An item with no last_enriched_at is never fresh."""
    _make_stats_item(mock_catalog_db, "never", last_enriched_at=None)
    stats = await get_catalog_stats(mock_catalog_db)
    assert stats.fresh == 0
    assert stats.stale == 1


@pytest.mark.asyncio
@pytest.mark.unit
async def test_catalog_stats_missing_image_counts_and_not_fresh(mock_catalog_db):
    """Missing image_url is counted and makes the item incomplete (not fresh)."""
    _make_stats_item(mock_catalog_db, "no-image", image_url=None)
    stats = await get_catalog_stats(mock_catalog_db)
    assert stats.missing_image_url == 1
    assert stats.fresh == 0
    assert stats.stale == 1


@pytest.mark.asyncio
@pytest.mark.unit
async def test_catalog_stats_missing_nutrition_food_not_fresh(mock_catalog_db):
    """Food missing nutrition is counted and incomplete (not fresh)."""
    _make_stats_item(mock_catalog_db, "no-nutrition", nutrition=None)
    stats = await get_catalog_stats(mock_catalog_db)
    assert stats.missing_nutrition == 1
    assert stats.fresh == 0


@pytest.mark.asyncio
@pytest.mark.unit
async def test_catalog_stats_non_food_fresh_without_nutrition(mock_catalog_db):
    """Non-food items don't need nutrition to be complete/fresh."""
    _make_stats_item(mock_catalog_db, "soap", is_food=False, nutrition=None, nutriscore=None)
    stats = await get_catalog_stats(mock_catalog_db)
    assert stats.fresh == 1
    assert stats.stale == 0
    # The null nutrition/nutriscore are still surfaced in the missing counts.
    assert stats.missing_nutrition == 1
    assert stats.missing_nutriscore == 1


@pytest.mark.asyncio
@pytest.mark.unit
async def test_catalog_stats_missing_nutriscore_independent_of_freshness(mock_catalog_db):
    """nutriscore is not part of completeness: a complete food item with no
    nutriscore is still fresh, but is counted as missing_nutriscore."""
    _make_stats_item(mock_catalog_db, "no-score", nutriscore=None)
    stats = await get_catalog_stats(mock_catalog_db)
    assert stats.fresh == 1
    assert stats.missing_nutriscore == 1


@pytest.mark.asyncio
@pytest.mark.unit
async def test_catalog_stats_mixed_totals(mock_catalog_db):
    """Totals and buckets aggregate correctly over a mixed catalog."""
    _make_stats_item(mock_catalog_db, "fresh-1")
    _make_stats_item(mock_catalog_db, "fresh-2")
    _make_stats_item(
        mock_catalog_db, "stale-1", last_enriched_at=datetime.now(UTC) - timedelta(days=30)
    )
    _make_stats_item(mock_catalog_db, "no-image", image_url=None)
    _make_stats_item(mock_catalog_db, "no-nutrition", nutrition=None)

    stats = await get_catalog_stats(mock_catalog_db)
    assert stats.total == 5
    assert stats.fresh == 2
    assert stats.stale == 3
    assert stats.missing_image_url == 1
    assert stats.missing_nutrition == 1
