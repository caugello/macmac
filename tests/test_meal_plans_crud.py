"""Tests for meal plans CRUD operations."""

import uuid
from datetime import date, timedelta
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from services.meal_plans.crud import (
    copy_day,
    copy_week,
    create_meal_plan,
    delete_meal_plan,
    generate_shopping_list,
    get_meal_plan,
    list_meal_plans,
    update_meal_plan,
)
from services.shared.schemas.meal_plan import (
    CopyDayRequest,
    CopyWeekRequest,
    MealPlanCreate,
    MealPlanUpdate,
    MealTypeEnum,
    ShoppingListRequest,
)

TEST_RECIPE_A = uuid.UUID("aaaaaaaa-aaaa-4aaa-baaa-aaaaaaaaaaaa")
TEST_RECIPE_B = uuid.UUID("bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb")
TEST_RECIPE_C = uuid.UUID("cccccccc-cccc-4ccc-bccc-cccccccccccc")

MONDAY = date(2026, 5, 11)
TUESDAY = date(2026, 5, 12)
NEXT_MONDAY = date(2026, 5, 18)


# ===== CRUD BASICS =====


@pytest.mark.asyncio
@pytest.mark.unit
async def test_create_meal_plan(mock_meal_plans_db):
    data = MealPlanCreate(date=MONDAY, meal_type=MealTypeEnum.BREAKFAST, recipe_id=TEST_RECIPE_A)
    result = await create_meal_plan(data, mock_meal_plans_db)

    assert result.date == MONDAY
    assert result.meal_type == MealTypeEnum.BREAKFAST
    assert result.recipe_id == TEST_RECIPE_A
    assert result.recipe_title is not None
    assert result.id is not None


@pytest.mark.asyncio
@pytest.mark.unit
async def test_create_meal_plan_duplicate_slot(mock_meal_plans_db):
    data = MealPlanCreate(date=MONDAY, meal_type=MealTypeEnum.LUNCH, recipe_id=TEST_RECIPE_A)
    await create_meal_plan(data, mock_meal_plans_db)

    with pytest.raises(HTTPException) as exc_info:
        await create_meal_plan(data, mock_meal_plans_db)

    assert exc_info.value.status_code == 400
    assert "already occupied" in str(exc_info.value.detail)


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_meal_plans_empty(mock_meal_plans_db):
    result = await list_meal_plans(
        mock_meal_plans_db, start_date=MONDAY, end_date=MONDAY + timedelta(days=6)
    )
    assert result.total == 0
    assert len(result.data) == 0


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_meal_plans_with_data(mock_meal_plans_db):
    for mt in [MealTypeEnum.BREAKFAST, MealTypeEnum.LUNCH, MealTypeEnum.DINNER]:
        await create_meal_plan(
            MealPlanCreate(date=MONDAY, meal_type=mt, recipe_id=TEST_RECIPE_A),
            mock_meal_plans_db,
        )

    result = await list_meal_plans(
        mock_meal_plans_db, start_date=MONDAY, end_date=MONDAY + timedelta(days=6)
    )
    assert result.total == 3
    assert len(result.data) == 3


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_meal_plans_date_range(mock_meal_plans_db):
    await create_meal_plan(
        MealPlanCreate(date=MONDAY, meal_type=MealTypeEnum.BREAKFAST, recipe_id=TEST_RECIPE_A),
        mock_meal_plans_db,
    )
    await create_meal_plan(
        MealPlanCreate(date=TUESDAY, meal_type=MealTypeEnum.BREAKFAST, recipe_id=TEST_RECIPE_B),
        mock_meal_plans_db,
    )

    result = await list_meal_plans(mock_meal_plans_db, start_date=MONDAY, end_date=MONDAY)
    assert result.total == 1
    assert result.data[0].recipe_id == TEST_RECIPE_A


@pytest.mark.asyncio
@pytest.mark.unit
async def test_get_meal_plan(mock_meal_plans_db):
    created = await create_meal_plan(
        MealPlanCreate(date=MONDAY, meal_type=MealTypeEnum.DINNER, recipe_id=TEST_RECIPE_A),
        mock_meal_plans_db,
    )

    result = await get_meal_plan(created.id, mock_meal_plans_db)
    assert result.id == created.id
    assert result.date == MONDAY
    assert result.meal_type == MealTypeEnum.DINNER


@pytest.mark.asyncio
@pytest.mark.unit
async def test_get_meal_plan_not_found(mock_meal_plans_db):
    with pytest.raises(HTTPException) as exc_info:
        await get_meal_plan(uuid.uuid4(), mock_meal_plans_db)
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
@pytest.mark.unit
async def test_update_meal_plan(mock_meal_plans_db):
    created = await create_meal_plan(
        MealPlanCreate(date=MONDAY, meal_type=MealTypeEnum.BREAKFAST, recipe_id=TEST_RECIPE_A),
        mock_meal_plans_db,
    )

    result = await update_meal_plan(
        created.id,
        MealPlanUpdate(recipe_id=TEST_RECIPE_B),
        mock_meal_plans_db,
    )
    assert result.recipe_id == TEST_RECIPE_B


@pytest.mark.asyncio
@pytest.mark.unit
async def test_update_meal_plan_not_found(mock_meal_plans_db):
    with pytest.raises(HTTPException) as exc_info:
        await update_meal_plan(
            uuid.uuid4(), MealPlanUpdate(recipe_id=TEST_RECIPE_A), mock_meal_plans_db
        )
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
@pytest.mark.unit
async def test_delete_meal_plan(mock_meal_plans_db):
    created = await create_meal_plan(
        MealPlanCreate(date=MONDAY, meal_type=MealTypeEnum.BREAKFAST, recipe_id=TEST_RECIPE_A),
        mock_meal_plans_db,
    )

    result = await delete_meal_plan(created.id, mock_meal_plans_db)
    assert result.success is True

    with pytest.raises(HTTPException) as exc_info:
        await get_meal_plan(created.id, mock_meal_plans_db)
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
@pytest.mark.unit
async def test_delete_meal_plan_not_found(mock_meal_plans_db):
    with pytest.raises(HTTPException) as exc_info:
        await delete_meal_plan(uuid.uuid4(), mock_meal_plans_db)
    assert exc_info.value.status_code == 404


# ===== COPY OPERATIONS =====


@pytest.mark.asyncio
@pytest.mark.unit
async def test_copy_day(mock_meal_plans_db):
    for mt in [MealTypeEnum.BREAKFAST, MealTypeEnum.LUNCH, MealTypeEnum.DINNER]:
        await create_meal_plan(
            MealPlanCreate(date=MONDAY, meal_type=mt, recipe_id=TEST_RECIPE_A),
            mock_meal_plans_db,
        )

    result = await copy_day(
        CopyDayRequest(source_date=MONDAY, target_date=TUESDAY),
        mock_meal_plans_db,
    )
    assert result.copied_count == 3

    target_meals = await list_meal_plans(mock_meal_plans_db, start_date=TUESDAY, end_date=TUESDAY)
    assert target_meals.total == 3


@pytest.mark.asyncio
@pytest.mark.unit
async def test_copy_day_no_source(mock_meal_plans_db):
    with pytest.raises(HTTPException) as exc_info:
        await copy_day(
            CopyDayRequest(source_date=MONDAY, target_date=TUESDAY),
            mock_meal_plans_db,
        )
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
@pytest.mark.unit
async def test_copy_week(mock_meal_plans_db):
    for day_offset in range(7):
        d = MONDAY + timedelta(days=day_offset)
        await create_meal_plan(
            MealPlanCreate(date=d, meal_type=MealTypeEnum.BREAKFAST, recipe_id=TEST_RECIPE_A),
            mock_meal_plans_db,
        )

    result = await copy_week(
        CopyWeekRequest(source_week_start=MONDAY, target_week_start=NEXT_MONDAY),
        mock_meal_plans_db,
    )
    assert result.copied_count == 7

    target_meals = await list_meal_plans(
        mock_meal_plans_db,
        start_date=NEXT_MONDAY,
        end_date=NEXT_MONDAY + timedelta(days=6),
    )
    assert target_meals.total == 7


@pytest.mark.asyncio
@pytest.mark.unit
async def test_copy_week_not_monday(mock_meal_plans_db):
    with pytest.raises(HTTPException) as exc_info:
        await copy_week(
            CopyWeekRequest(source_week_start=TUESDAY, target_week_start=NEXT_MONDAY),
            mock_meal_plans_db,
        )
    assert exc_info.value.status_code == 400
    assert "Monday" in str(exc_info.value.detail)


# ===== SHOPPING LIST =====


@pytest.mark.asyncio
@pytest.mark.unit
async def test_generate_shopping_list(mock_meal_plans_db):
    await create_meal_plan(
        MealPlanCreate(date=MONDAY, meal_type=MealTypeEnum.BREAKFAST, recipe_id=TEST_RECIPE_A),
        mock_meal_plans_db,
    )

    catalog_id = "11111111-1111-4111-b111-111111111111"

    mock_recipes_response = MagicMock()
    mock_recipes_response.json.return_value = {
        "items": {
            str(TEST_RECIPE_A): {
                "title": "Test Recipe",
                "ingredients": [
                    {"catalog_item_id": catalog_id, "qty": 500.0, "unit": "g"},
                ],
            }
        }
    }

    mock_catalog_response = MagicMock()
    mock_catalog_response.json.return_value = {
        "items": {
            catalog_id: {
                "canonical_name": "Flour",
                "raw_name": "flour",
                "price": 2.50,
                "net_quantity_value": 1000.0,
                "net_quantity_unit": "g",
                "category": "Baking",
            }
        }
    }

    async def mock_service_req(method, url, **kwargs):
        if "/recipes/batch" in url:
            return mock_recipes_response
        if "/catalog/batch" in url:
            return mock_catalog_response
        raise ValueError(f"Unexpected URL: {url}")

    with patch("services.meal_plans.crud.service_request", new=mock_service_req):
        result = await generate_shopping_list(
            ShoppingListRequest(start_date=MONDAY, end_date=MONDAY + timedelta(days=6)),
            mock_meal_plans_db,
        )

    assert result.total_items == 1
    assert "Baking" in result.items_by_category
    item = result.items_by_category["Baking"][0]
    assert item.catalog_item_name == "Flour"
    assert item.price == 2.50
    assert item.packages_needed == 1
    assert item.package_size == 1000.0
    assert item.package_unit == "g"
    assert item.line_total == pytest.approx(2.50)
    assert result.estimated_total == pytest.approx(2.50)


@pytest.mark.asyncio
@pytest.mark.unit
async def test_generate_shopping_list_empty(mock_meal_plans_db):
    with pytest.raises(HTTPException) as exc_info:
        await generate_shopping_list(
            ShoppingListRequest(start_date=MONDAY, end_date=MONDAY + timedelta(days=6)),
            mock_meal_plans_db,
        )
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
@pytest.mark.unit
async def test_generate_shopping_list_aggregates_quantities(mock_meal_plans_db):
    await create_meal_plan(
        MealPlanCreate(date=MONDAY, meal_type=MealTypeEnum.BREAKFAST, recipe_id=TEST_RECIPE_A),
        mock_meal_plans_db,
    )
    await create_meal_plan(
        MealPlanCreate(date=TUESDAY, meal_type=MealTypeEnum.BREAKFAST, recipe_id=TEST_RECIPE_B),
        mock_meal_plans_db,
    )

    catalog_id = "11111111-1111-4111-b111-111111111111"

    mock_recipes_response = MagicMock()
    mock_recipes_response.json.return_value = {
        "items": {
            str(TEST_RECIPE_A): {
                "title": "Recipe A",
                "ingredients": [{"catalog_item_id": catalog_id, "qty": 200.0, "unit": "g"}],
            },
            str(TEST_RECIPE_B): {
                "title": "Recipe B",
                "ingredients": [{"catalog_item_id": catalog_id, "qty": 300.0, "unit": "g"}],
            },
        }
    }

    mock_catalog_response = MagicMock()
    mock_catalog_response.json.return_value = {
        "items": {
            catalog_id: {
                "canonical_name": "Sugar",
                "raw_name": "sugar",
                "price": 1.50,
                "net_quantity_value": 1000.0,
                "net_quantity_unit": "g",
                "category": "Baking",
            }
        }
    }

    async def mock_service_req(method, url, **kwargs):
        if "/recipes/batch" in url:
            return mock_recipes_response
        if "/catalog/batch" in url:
            return mock_catalog_response
        raise ValueError(f"Unexpected URL: {url}")

    with patch("services.meal_plans.crud.service_request", new=mock_service_req):
        result = await generate_shopping_list(
            ShoppingListRequest(start_date=MONDAY, end_date=TUESDAY),
            mock_meal_plans_db,
        )

    assert result.total_items == 1
    baking_items = result.items_by_category["Baking"]
    assert baking_items[0].total_qty == 500.0
    assert baking_items[0].packages_needed == 1
    assert baking_items[0].line_total == pytest.approx(1.50)
    assert result.estimated_total == pytest.approx(1.50)


@pytest.mark.asyncio
@pytest.mark.unit
async def test_generate_shopping_list_price_without_net_quantity(mock_meal_plans_db):
    """When net_quantity_value is missing, line_total falls back to unit price."""
    await create_meal_plan(
        MealPlanCreate(date=MONDAY, meal_type=MealTypeEnum.BREAKFAST, recipe_id=TEST_RECIPE_A),
        mock_meal_plans_db,
    )

    catalog_id = "11111111-1111-4111-b111-111111111111"

    mock_recipes_response = MagicMock()
    mock_recipes_response.json.return_value = {
        "items": {
            str(TEST_RECIPE_A): {
                "title": "Test Recipe",
                "ingredients": [
                    {"catalog_item_id": catalog_id, "qty": 500.0, "unit": "g"},
                ],
            }
        }
    }

    mock_catalog_response = MagicMock()
    mock_catalog_response.json.return_value = {
        "items": {
            catalog_id: {
                "canonical_name": "Flour",
                "raw_name": "flour",
                "price": 2.50,
                "category": "Baking",
            }
        }
    }

    async def mock_service_req(method, url, **kwargs):
        if "/recipes/batch" in url:
            return mock_recipes_response
        if "/catalog/batch" in url:
            return mock_catalog_response
        raise ValueError(f"Unexpected URL: {url}")

    with patch("services.meal_plans.crud.service_request", new=mock_service_req):
        result = await generate_shopping_list(
            ShoppingListRequest(start_date=MONDAY, end_date=MONDAY + timedelta(days=6)),
            mock_meal_plans_db,
        )

    item = result.items_by_category["Baking"][0]
    assert item.price == 2.50
    assert item.line_total == 2.50
    assert result.estimated_total == 2.50


@pytest.mark.asyncio
@pytest.mark.unit
async def test_generate_shopping_list_with_promotion(mock_meal_plans_db):
    """Items with a future promotion_until_date are flagged as on promotion."""
    await create_meal_plan(
        MealPlanCreate(date=MONDAY, meal_type=MealTypeEnum.BREAKFAST, recipe_id=TEST_RECIPE_A),
        mock_meal_plans_db,
    )

    catalog_id = "11111111-1111-4111-b111-111111111111"

    mock_recipes_response = MagicMock()
    mock_recipes_response.json.return_value = {
        "items": {
            str(TEST_RECIPE_A): {
                "title": "Test Recipe",
                "ingredients": [
                    {"catalog_item_id": catalog_id, "qty": 500.0, "unit": "g"},
                ],
            }
        }
    }

    mock_catalog_response = MagicMock()
    mock_catalog_response.json.return_value = {
        "items": {
            catalog_id: {
                "canonical_name": "Flour",
                "raw_name": "flour",
                "price": 2.50,
                "net_quantity_value": 1000.0,
                "net_quantity_unit": "g",
                "category": "Baking",
                "promotion_until_date": "2099-12-31",
            }
        }
    }

    async def mock_service_req(method, url, **kwargs):
        if "/recipes/batch" in url:
            return mock_recipes_response
        if "/catalog/batch" in url:
            return mock_catalog_response
        raise ValueError(f"Unexpected URL: {url}")

    with patch("services.meal_plans.crud.service_request", new=mock_service_req):
        result = await generate_shopping_list(
            ShoppingListRequest(start_date=MONDAY, end_date=MONDAY + timedelta(days=6)),
            mock_meal_plans_db,
        )

    item = result.items_by_category["Baking"][0]
    assert item.is_on_promotion is True
    assert item.promotion_until_date == date(2099, 12, 31)


@pytest.mark.asyncio
@pytest.mark.unit
async def test_generate_shopping_list_expired_promotion(mock_meal_plans_db):
    """Items with a past promotion_until_date are NOT flagged as on promotion."""
    await create_meal_plan(
        MealPlanCreate(date=MONDAY, meal_type=MealTypeEnum.BREAKFAST, recipe_id=TEST_RECIPE_A),
        mock_meal_plans_db,
    )

    catalog_id = "11111111-1111-4111-b111-111111111111"

    mock_recipes_response = MagicMock()
    mock_recipes_response.json.return_value = {
        "items": {
            str(TEST_RECIPE_A): {
                "title": "Test Recipe",
                "ingredients": [
                    {"catalog_item_id": catalog_id, "qty": 500.0, "unit": "g"},
                ],
            }
        }
    }

    mock_catalog_response = MagicMock()
    mock_catalog_response.json.return_value = {
        "items": {
            catalog_id: {
                "canonical_name": "Flour",
                "raw_name": "flour",
                "price": 2.50,
                "net_quantity_value": 1000.0,
                "net_quantity_unit": "g",
                "category": "Baking",
                "promotion_until_date": "2020-01-01",
            }
        }
    }

    async def mock_service_req(method, url, **kwargs):
        if "/recipes/batch" in url:
            return mock_recipes_response
        if "/catalog/batch" in url:
            return mock_catalog_response
        raise ValueError(f"Unexpected URL: {url}")

    with patch("services.meal_plans.crud.service_request", new=mock_service_req):
        result = await generate_shopping_list(
            ShoppingListRequest(start_date=MONDAY, end_date=MONDAY + timedelta(days=6)),
            mock_meal_plans_db,
        )

    item = result.items_by_category["Baking"][0]
    assert item.is_on_promotion is False
    assert item.promotion_until_date is None


@pytest.mark.asyncio
@pytest.mark.unit
async def test_generate_shopping_list_unit_conversion(mock_meal_plans_db):
    """500g + 1kg of same item should merge into 1.5kg."""
    await create_meal_plan(
        MealPlanCreate(date=MONDAY, meal_type=MealTypeEnum.BREAKFAST, recipe_id=TEST_RECIPE_A),
        mock_meal_plans_db,
    )
    await create_meal_plan(
        MealPlanCreate(date=TUESDAY, meal_type=MealTypeEnum.BREAKFAST, recipe_id=TEST_RECIPE_B),
        mock_meal_plans_db,
    )

    catalog_id = "11111111-1111-4111-b111-111111111111"

    mock_recipes_response = MagicMock()
    mock_recipes_response.json.return_value = {
        "items": {
            str(TEST_RECIPE_A): {
                "title": "Recipe A",
                "ingredients": [{"catalog_item_id": catalog_id, "qty": 500.0, "unit": "g"}],
            },
            str(TEST_RECIPE_B): {
                "title": "Recipe B",
                "ingredients": [{"catalog_item_id": catalog_id, "qty": 1.0, "unit": "kg"}],
            },
        }
    }

    mock_catalog_response = MagicMock()
    mock_catalog_response.json.return_value = {
        "items": {
            catalog_id: {
                "canonical_name": "Flour",
                "raw_name": "flour",
                "price": 2.50,
                "net_quantity_value": 1000.0,
                "net_quantity_unit": "g",
                "category": "Baking",
            }
        }
    }

    async def mock_service_req(method, url, **kwargs):
        if "/recipes/batch" in url:
            return mock_recipes_response
        if "/catalog/batch" in url:
            return mock_catalog_response
        raise ValueError(f"Unexpected URL: {url}")

    with patch("services.meal_plans.crud.service_request", new=mock_service_req):
        result = await generate_shopping_list(
            ShoppingListRequest(start_date=MONDAY, end_date=TUESDAY),
            mock_meal_plans_db,
        )

    assert result.total_items == 1
    item = result.items_by_category["Baking"][0]
    assert item.total_qty == 1.5
    assert item.unit == "kg"
    assert item.packages_needed == 2


@pytest.mark.asyncio
@pytest.mark.unit
async def test_generate_shopping_list_incompatible_units(mock_meal_plans_db):
    """Same item with incompatible units (g + pc) should appear as separate lines."""
    await create_meal_plan(
        MealPlanCreate(date=MONDAY, meal_type=MealTypeEnum.BREAKFAST, recipe_id=TEST_RECIPE_A),
        mock_meal_plans_db,
    )
    await create_meal_plan(
        MealPlanCreate(date=TUESDAY, meal_type=MealTypeEnum.BREAKFAST, recipe_id=TEST_RECIPE_B),
        mock_meal_plans_db,
    )

    catalog_id = "11111111-1111-4111-b111-111111111111"

    mock_recipes_response = MagicMock()
    mock_recipes_response.json.return_value = {
        "items": {
            str(TEST_RECIPE_A): {
                "title": "Recipe A",
                "ingredients": [{"catalog_item_id": catalog_id, "qty": 500.0, "unit": "g"}],
            },
            str(TEST_RECIPE_B): {
                "title": "Recipe B",
                "ingredients": [{"catalog_item_id": catalog_id, "qty": 2.0, "unit": "pc"}],
            },
        }
    }

    mock_catalog_response = MagicMock()
    mock_catalog_response.json.return_value = {
        "items": {
            catalog_id: {
                "canonical_name": "Eggs",
                "raw_name": "eggs",
                "price": 3.00,
                "net_quantity_value": 1.0,
                "category": "Dairy",
            }
        }
    }

    async def mock_service_req(method, url, **kwargs):
        if "/recipes/batch" in url:
            return mock_recipes_response
        if "/catalog/batch" in url:
            return mock_catalog_response
        raise ValueError(f"Unexpected URL: {url}")

    with patch("services.meal_plans.crud.service_request", new=mock_service_req):
        result = await generate_shopping_list(
            ShoppingListRequest(start_date=MONDAY, end_date=TUESDAY),
            mock_meal_plans_db,
        )

    assert result.total_items == 2
    dairy_items = result.items_by_category["Dairy"]
    units = {item.unit for item in dairy_items}
    assert "g" in units
    assert "pc" in units


# ===== CACHE AUTH =====


@pytest.mark.asyncio
@pytest.mark.unit
async def test_get_meal_plan_cache_hit_with_string_uuids(mock_meal_plans_db):
    """Cached data stores UUIDs as strings; get_meal_plan must convert them for auth."""
    from services.framework.user_context import require_user_context

    user_ctx = require_user_context()

    created = await create_meal_plan(
        MealPlanCreate(date=MONDAY, meal_type=MealTypeEnum.BREAKFAST, recipe_id=TEST_RECIPE_A),
        mock_meal_plans_db,
    )

    cached_data = {
        "id": str(created.id),
        "date": str(created.date),
        "meal_type": "breakfast",
        "recipe_id": str(created.recipe_id),
        "recipe_title": "Test Recipe",
        "created_at": created.created_at.isoformat(),
        "updated_at": created.updated_at.isoformat(),
        "_user_id": str(user_ctx.user_id),
        "_group_id": str(user_ctx.group_ids[0]),
    }

    with patch("services.meal_plans.crud.cache") as mock_cache:
        mock_cache.get_json.return_value = cached_data
        result = await get_meal_plan(created.id, mock_meal_plans_db)

    assert result.id == created.id
    assert result.meal_type == MealTypeEnum.BREAKFAST


# ===== PACKAGE-AWARE QUANTITIES =====


@pytest.mark.asyncio
@pytest.mark.unit
async def test_shopping_list_package_rounding_up(mock_meal_plans_db):
    """Need 500g, sold as 150g packages -> packages_needed=4, line_total = price * 4."""
    await create_meal_plan(
        MealPlanCreate(date=MONDAY, meal_type=MealTypeEnum.BREAKFAST, recipe_id=TEST_RECIPE_A),
        mock_meal_plans_db,
    )

    catalog_id = "11111111-1111-4111-b111-111111111111"

    mock_recipes_response = MagicMock()
    mock_recipes_response.json.return_value = {
        "items": {
            str(TEST_RECIPE_A): {
                "title": "Test Recipe",
                "ingredients": [{"catalog_item_id": catalog_id, "qty": 500.0, "unit": "g"}],
            }
        }
    }

    mock_catalog_response = MagicMock()
    mock_catalog_response.json.return_value = {
        "items": {
            catalog_id: {
                "canonical_name": "Cheese",
                "raw_name": "cheese",
                "price": 3.00,
                "net_quantity_value": 150.0,
                "net_quantity_unit": "g",
                "category": "Dairy",
            }
        }
    }

    async def mock_service_req(method, url, **kwargs):
        if "/recipes/batch" in url:
            return mock_recipes_response
        if "/catalog/batch" in url:
            return mock_catalog_response
        raise ValueError(f"Unexpected URL: {url}")

    with patch("services.meal_plans.crud.service_request", new=mock_service_req):
        result = await generate_shopping_list(
            ShoppingListRequest(start_date=MONDAY, end_date=MONDAY + timedelta(days=6)),
            mock_meal_plans_db,
        )

    item = result.items_by_category["Dairy"][0]
    assert item.packages_needed == 4
    assert item.package_size == 150.0
    assert item.package_unit == "g"
    assert item.line_total == pytest.approx(12.00)
    assert result.estimated_total == pytest.approx(12.00)


@pytest.mark.asyncio
@pytest.mark.unit
async def test_shopping_list_package_exact_fit(mock_meal_plans_db):
    """Need 300g, sold as 150g packages -> packages_needed=2."""
    await create_meal_plan(
        MealPlanCreate(date=MONDAY, meal_type=MealTypeEnum.BREAKFAST, recipe_id=TEST_RECIPE_A),
        mock_meal_plans_db,
    )

    catalog_id = "11111111-1111-4111-b111-111111111111"

    mock_recipes_response = MagicMock()
    mock_recipes_response.json.return_value = {
        "items": {
            str(TEST_RECIPE_A): {
                "title": "Test Recipe",
                "ingredients": [{"catalog_item_id": catalog_id, "qty": 300.0, "unit": "g"}],
            }
        }
    }

    mock_catalog_response = MagicMock()
    mock_catalog_response.json.return_value = {
        "items": {
            catalog_id: {
                "canonical_name": "Cheese",
                "raw_name": "cheese",
                "price": 3.00,
                "net_quantity_value": 150.0,
                "net_quantity_unit": "g",
                "category": "Dairy",
            }
        }
    }

    async def mock_service_req(method, url, **kwargs):
        if "/recipes/batch" in url:
            return mock_recipes_response
        if "/catalog/batch" in url:
            return mock_catalog_response
        raise ValueError(f"Unexpected URL: {url}")

    with patch("services.meal_plans.crud.service_request", new=mock_service_req):
        result = await generate_shopping_list(
            ShoppingListRequest(start_date=MONDAY, end_date=MONDAY + timedelta(days=6)),
            mock_meal_plans_db,
        )

    item = result.items_by_category["Dairy"][0]
    assert item.packages_needed == 2
    assert item.line_total == pytest.approx(6.00)


@pytest.mark.asyncio
@pytest.mark.unit
async def test_shopping_list_package_discrete(mock_meal_plans_db):
    """Need 3pc apples, sold in 6pc packs -> packages_needed=1."""
    await create_meal_plan(
        MealPlanCreate(date=MONDAY, meal_type=MealTypeEnum.BREAKFAST, recipe_id=TEST_RECIPE_A),
        mock_meal_plans_db,
    )

    catalog_id = "11111111-1111-4111-b111-111111111111"

    mock_recipes_response = MagicMock()
    mock_recipes_response.json.return_value = {
        "items": {
            str(TEST_RECIPE_A): {
                "title": "Test Recipe",
                "ingredients": [{"catalog_item_id": catalog_id, "qty": 3.0, "unit": "pc"}],
            }
        }
    }

    mock_catalog_response = MagicMock()
    mock_catalog_response.json.return_value = {
        "items": {
            catalog_id: {
                "canonical_name": "Apples",
                "raw_name": "apples",
                "price": 4.50,
                "net_quantity_value": 6.0,
                "net_quantity_unit": "pc",
                "category": "Produce",
            }
        }
    }

    async def mock_service_req(method, url, **kwargs):
        if "/recipes/batch" in url:
            return mock_recipes_response
        if "/catalog/batch" in url:
            return mock_catalog_response
        raise ValueError(f"Unexpected URL: {url}")

    with patch("services.meal_plans.crud.service_request", new=mock_service_req):
        result = await generate_shopping_list(
            ShoppingListRequest(start_date=MONDAY, end_date=MONDAY + timedelta(days=6)),
            mock_meal_plans_db,
        )

    item = result.items_by_category["Produce"][0]
    assert item.packages_needed == 1
    assert item.package_size == 6.0
    assert item.package_unit == "pc"
    assert item.line_total == pytest.approx(4.50)


@pytest.mark.asyncio
@pytest.mark.unit
async def test_shopping_list_no_package_info(mock_meal_plans_db):
    """No net_quantity_value -> packages_needed=None, line_total falls back to unit price."""
    await create_meal_plan(
        MealPlanCreate(date=MONDAY, meal_type=MealTypeEnum.BREAKFAST, recipe_id=TEST_RECIPE_A),
        mock_meal_plans_db,
    )

    catalog_id = "11111111-1111-4111-b111-111111111111"

    mock_recipes_response = MagicMock()
    mock_recipes_response.json.return_value = {
        "items": {
            str(TEST_RECIPE_A): {
                "title": "Test Recipe",
                "ingredients": [{"catalog_item_id": catalog_id, "qty": 500.0, "unit": "g"}],
            }
        }
    }

    mock_catalog_response = MagicMock()
    mock_catalog_response.json.return_value = {
        "items": {
            catalog_id: {
                "canonical_name": "Spice",
                "raw_name": "spice",
                "price": 5.00,
                "category": "Spices",
            }
        }
    }

    async def mock_service_req(method, url, **kwargs):
        if "/recipes/batch" in url:
            return mock_recipes_response
        if "/catalog/batch" in url:
            return mock_catalog_response
        raise ValueError(f"Unexpected URL: {url}")

    with patch("services.meal_plans.crud.service_request", new=mock_service_req):
        result = await generate_shopping_list(
            ShoppingListRequest(start_date=MONDAY, end_date=MONDAY + timedelta(days=6)),
            mock_meal_plans_db,
        )

    item = result.items_by_category["Spices"][0]
    assert item.packages_needed is None
    assert item.package_size is None
    assert item.package_unit is None
    assert item.line_total == pytest.approx(5.00)


@pytest.mark.asyncio
@pytest.mark.unit
async def test_shopping_list_same_recipe_multiple_meals(mock_meal_plans_db):
    """Same recipe scheduled 3 times should multiply ingredients by 3."""
    await create_meal_plan(
        MealPlanCreate(date=MONDAY, meal_type=MealTypeEnum.BREAKFAST, recipe_id=TEST_RECIPE_A),
        mock_meal_plans_db,
    )
    await create_meal_plan(
        MealPlanCreate(date=MONDAY, meal_type=MealTypeEnum.LUNCH, recipe_id=TEST_RECIPE_A),
        mock_meal_plans_db,
    )
    await create_meal_plan(
        MealPlanCreate(date=MONDAY, meal_type=MealTypeEnum.DINNER, recipe_id=TEST_RECIPE_A),
        mock_meal_plans_db,
    )

    catalog_id = "11111111-1111-4111-b111-111111111111"

    mock_recipes_response = MagicMock()
    mock_recipes_response.json.return_value = {
        "items": {
            str(TEST_RECIPE_A): {
                "title": "Test Recipe",
                "ingredients": [{"catalog_item_id": catalog_id, "qty": 200.0, "unit": "g"}],
            }
        }
    }

    mock_catalog_response = MagicMock()
    mock_catalog_response.json.return_value = {
        "items": {
            catalog_id: {
                "canonical_name": "Rice",
                "raw_name": "rice",
                "price": 2.00,
                "net_quantity_value": 500.0,
                "net_quantity_unit": "g",
                "category": "Grains",
            }
        }
    }

    async def mock_service_req(method, url, **kwargs):
        if "/recipes/batch" in url:
            return mock_recipes_response
        if "/catalog/batch" in url:
            return mock_catalog_response
        raise ValueError(f"Unexpected URL: {url}")

    with patch("services.meal_plans.crud.service_request", new=mock_service_req):
        result = await generate_shopping_list(
            ShoppingListRequest(start_date=MONDAY, end_date=MONDAY),
            mock_meal_plans_db,
        )

    assert result.total_items == 1
    item = result.items_by_category["Grains"][0]
    assert item.total_qty == 600.0
    assert item.unit == "g"
    assert item.packages_needed == 2
    assert item.line_total == pytest.approx(4.00)


# ===== NOTES =====


@pytest.mark.asyncio
@pytest.mark.unit
async def test_create_meal_plan_with_notes(mock_meal_plans_db):
    data = MealPlanCreate(
        date=MONDAY,
        meal_type=MealTypeEnum.BREAKFAST,
        recipe_id=TEST_RECIPE_A,
        notes="Prep the night before",
    )
    result = await create_meal_plan(data, mock_meal_plans_db)

    assert result.notes == "Prep the night before"


@pytest.mark.asyncio
@pytest.mark.unit
async def test_create_meal_plan_without_notes(mock_meal_plans_db):
    data = MealPlanCreate(
        date=MONDAY,
        meal_type=MealTypeEnum.LUNCH,
        recipe_id=TEST_RECIPE_A,
    )
    result = await create_meal_plan(data, mock_meal_plans_db)

    assert result.notes is None


@pytest.mark.asyncio
@pytest.mark.unit
async def test_update_meal_plan_notes(mock_meal_plans_db):
    created = await create_meal_plan(
        MealPlanCreate(date=MONDAY, meal_type=MealTypeEnum.DINNER, recipe_id=TEST_RECIPE_A),
        mock_meal_plans_db,
    )

    result = await update_meal_plan(
        created.id,
        MealPlanUpdate(notes="Use leftovers for lunch"),
        mock_meal_plans_db,
    )

    assert result.notes == "Use leftovers for lunch"


@pytest.mark.asyncio
@pytest.mark.unit
async def test_update_meal_plan_clear_notes(mock_meal_plans_db):
    created = await create_meal_plan(
        MealPlanCreate(
            date=MONDAY,
            meal_type=MealTypeEnum.BREAKFAST,
            recipe_id=TEST_RECIPE_A,
            notes="Will be cleared",
        ),
        mock_meal_plans_db,
    )
    assert created.notes == "Will be cleared"

    result = await update_meal_plan(
        created.id,
        MealPlanUpdate(notes=""),
        mock_meal_plans_db,
    )

    assert result.notes == ""


@pytest.mark.asyncio
@pytest.mark.unit
async def test_update_meal_plan_unauthorized(mock_meal_plans_db):
    created = await create_meal_plan(
        MealPlanCreate(date=MONDAY, meal_type=MealTypeEnum.LUNCH, recipe_id=TEST_RECIPE_A),
        mock_meal_plans_db,
    )

    # Switch to a different user
    from services.framework.user_context import set_user_context

    set_user_context(user_id=uuid.uuid4(), username="otheruser", group_ids=[])

    with pytest.raises(HTTPException) as exc_info:
        await update_meal_plan(
            created.id,
            MealPlanUpdate(notes="Hijacked"),
            mock_meal_plans_db,
        )

    assert exc_info.value.status_code == 403
