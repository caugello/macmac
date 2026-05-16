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
    assert result.items_by_category["Baking"][0].catalog_item_name == "Flour"
    assert result.estimated_total == 2.50


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
