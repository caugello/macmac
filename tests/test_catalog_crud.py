"""Tests for catalog CRUD operations."""

import uuid

import pytest
from fastapi import HTTPException

from services.catalog.crud import (
    create_catalog_item,
    get_catalog_item,
    list_catalog_items,
)
from services.shared.schemas.catalog import CatalogItemCreate


@pytest.mark.asyncio
@pytest.mark.unit
async def test_create_catalog_item(mock_catalog_db):
    """Test creating a new catalog item."""
    item_data = CatalogItemCreate(
        vendor_name="test_vendor",
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
async def test_create_catalog_item_minimal(mock_catalog_db):
    """Test creating a catalog item with minimal required fields."""
    item_data = CatalogItemCreate(
        vendor_name="test_vendor",
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
async def test_create_catalog_item_duplicate_url(mock_catalog_db):
    """Test that creating an item with duplicate product_url raises error."""
    item_data = CatalogItemCreate(
        vendor_name="test_vendor",
        raw_name="Product A",
        product_url="https://example.com/products/duplicate",
        is_food=True,
    )

    await create_catalog_item(item_data, mock_catalog_db)

    # Try to create another with same URL
    duplicate_data = CatalogItemCreate(
        vendor_name="test_vendor",
        raw_name="Product B",
        product_url="https://example.com/products/duplicate",
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
async def test_list_catalog_items_with_sort(mock_catalog_db):
    """Test sorting catalog items."""
    # Create items in random order
    await create_catalog_item(
        CatalogItemCreate(
            vendor_name="test_vendor",
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
        ("Milk 1L", "https://example.com/milk", True, "Dairy"),
        ("Bread", "https://example.com/bread", True, "Bakery"),
        ("Cheese", "https://example.com/cheese", True, "Dairy"),
        ("Dish Soap", "https://example.com/soap", False, "Household"),
        ("Sponge 3pc", "https://example.com/sponge", False, "Household"),
    ]
    for name, url, is_food, cat in foods:
        await create_catalog_item(
            CatalogItemCreate(
                vendor_name="test_vendor",
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
