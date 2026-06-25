"""Tests for recipes CRUD operations."""

import uuid
from unittest.mock import patch

import pytest
from fastapi import HTTPException

from services.recipes.crud import (
    category_counts,
    create_recipe,
    delete_recipe,
    get_recipe,
    list_recipes,
    update_recipe,
)
from services.shared.schemas.generic import UnitEnum
from services.shared.schemas.ingredient import IngredientCreate
from services.shared.schemas.recipe import (
    RecipeCategoryEnum,
    RecipeCreate,
    RecipeDifficultyEnum,
    RecipeUpdate,
)

# Test catalog item IDs (these will be mocked by the fixture)
# Using valid UUID4 format (version 4 bit pattern)
TEST_CATALOG_ITEM_FLOUR = uuid.UUID("12345678-1234-4234-b234-123456789001")
TEST_CATALOG_ITEM_SUGAR = uuid.UUID("12345678-1234-4234-b234-123456789002")
TEST_CATALOG_ITEM_CHOCOLATE = uuid.UUID("12345678-1234-4234-b234-123456789003")
TEST_CATALOG_ITEM_VANILLA = uuid.UUID("12345678-1234-4234-b234-123456789004")
TEST_CATALOG_ITEM_APPLES = uuid.UUID("12345678-1234-4234-b234-123456789005")
TEST_CATALOG_ITEM_INGREDIENT = uuid.UUID("12345678-1234-4234-b234-123456789006")


@pytest.mark.asyncio
@pytest.mark.unit
async def test_create_recipe(mock_db):
    """Test creating a new recipe."""
    recipe_data = RecipeCreate(
        title="Test Recipe",
        description="A test recipe",
        ingredients=[
            IngredientCreate(
                catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=2.0, unit=UnitEnum.KILOGRAM
            ),
            IngredientCreate(
                catalog_item_id=TEST_CATALOG_ITEM_SUGAR, qty=1.0, unit=UnitEnum.KILOGRAM
            ),
        ],
        steps=["Mix ingredients", "Bake at 350F"],
    )

    result = await create_recipe(recipe_data, mock_db)

    assert result.title == "Test Recipe"
    assert result.normalized_title == "test recipe"
    assert result.description == "A test recipe"
    assert len(result.ingredients) == 2
    assert len(result.steps) == 2


@pytest.mark.asyncio
@pytest.mark.unit
async def test_create_recipe_duplicate_title(mock_db):
    """Test that creating a recipe with duplicate title raises error."""
    recipe_data = RecipeCreate(
        title="Duplicate Recipe",
        description="First recipe",
        ingredients=[
            IngredientCreate(
                catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=1.0, unit=UnitEnum.KILOGRAM
            )
        ],
        steps=["Step 1"],
    )

    await create_recipe(recipe_data, mock_db)

    # Try to create another with same title
    with pytest.raises(HTTPException) as exc_info:
        await create_recipe(recipe_data, mock_db)

    assert exc_info.value.status_code == 400
    assert "already exists" in str(exc_info.value.detail)


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_recipes_empty(mock_db):
    """Test listing recipes when database is empty."""
    result = await list_recipes(mock_db)

    assert result["total"] == 0
    assert result["limit"] == 20
    assert result["offset"] == 0
    assert len(result["data"]) == 0


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_recipes_with_data(mock_db):
    """Test listing recipes with pagination."""
    # Create test recipes
    for i in range(5):
        recipe_data = RecipeCreate(
            title=f"Recipe {i}",
            description=f"Description {i}",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_INGREDIENT, qty=1.0, unit=UnitEnum.GRAM
                )
            ],
            steps=[f"Step {i}"],
        )
        await create_recipe(recipe_data, mock_db)

    # List all recipes
    result = await list_recipes(mock_db, limit=10, offset=0)

    assert result["total"] == 5
    assert len(result["data"]) == 5


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_recipes_with_search(mock_db):
    """Test searching recipes by title."""
    # Create recipes
    await create_recipe(
        RecipeCreate(
            title="Chocolate Cake",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_CHOCOLATE, qty=100.0, unit=UnitEnum.GRAM
                )
            ],
        ),
        mock_db,
    )
    await create_recipe(
        RecipeCreate(
            title="Vanilla Cookies",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_VANILLA, qty=1.0, unit=UnitEnum.TEASPOON
                )
            ],
        ),
        mock_db,
    )

    # Search for chocolate
    result = await list_recipes(mock_db, search="chocolate")

    assert result["total"] == 1
    assert result["data"][0].title == "Chocolate Cake"


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_recipes_with_sort(mock_db):
    """Test sorting recipes."""
    # Create recipes in random order
    await create_recipe(
        RecipeCreate(
            title="Zebra Cake",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=1.0, unit=UnitEnum.KILOGRAM
                )
            ],
        ),
        mock_db,
    )
    await create_recipe(
        RecipeCreate(
            title="Apple Pie",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_APPLES, qty=3.0, unit=UnitEnum.PIECE
                )
            ],
        ),
        mock_db,
    )

    # Sort ascending
    result = await list_recipes(mock_db, sort="title:asc")
    assert result["data"][0].title == "Apple Pie"
    assert result["data"][1].title == "Zebra Cake"

    # Sort descending
    result = await list_recipes(mock_db, sort="title:desc")
    assert result["data"][0].title == "Zebra Cake"
    assert result["data"][1].title == "Apple Pie"


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_recipes_invalid_sort(mock_db):
    """Test that invalid sort parameter raises error."""
    with pytest.raises(HTTPException) as exc_info:
        await list_recipes(mock_db, sort="invalid_sort")

    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_recipes_invalid_sort_direction(mock_db):
    """Test that invalid sort direction raises error."""
    # Create a test recipe
    await create_recipe(
        RecipeCreate(
            title="Test Recipe",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=1.0, unit=UnitEnum.KILOGRAM
                )
            ],
        ),
        mock_db,
    )

    # Try invalid sort direction
    with pytest.raises(HTTPException) as exc_info:
        await list_recipes(mock_db, sort="title:invalid")

    assert exc_info.value.status_code == 400
    assert "Invalid sort value" in str(exc_info.value.detail)


@pytest.mark.asyncio
@pytest.mark.unit
async def test_get_recipe(mock_db):
    """Test getting a recipe by ID."""
    # Create a recipe
    created = await create_recipe(
        RecipeCreate(
            title="Test Recipe",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=1.0, unit=UnitEnum.KILOGRAM
                )
            ],
        ),
        mock_db,
    )

    # Get it back
    result = await get_recipe(created.id, mock_db)

    assert result.id == created.id
    assert result.title == "Test Recipe"


@pytest.mark.asyncio
@pytest.mark.unit
async def test_get_recipe_not_found(mock_db):
    """Test getting a non-existent recipe raises 404."""
    fake_id = uuid.uuid4()

    with pytest.raises(HTTPException) as exc_info:
        await get_recipe(fake_id, mock_db)

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
@pytest.mark.unit
async def test_update_recipe(mock_db):
    """Test updating a recipe."""
    # Create a recipe
    created = await create_recipe(
        RecipeCreate(
            title="Original Title",
            description="Original description",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=1.0, unit=UnitEnum.KILOGRAM
                )
            ],
            steps=["Step 1"],
        ),
        mock_db,
    )

    # Update it
    update_data = RecipeUpdate(
        title="Updated Title",
        description="Updated description",
    )

    result = await update_recipe(created.id, update_data, mock_db)

    assert result.id == created.id
    assert result.title == "Updated Title"
    assert result.normalized_title == "updated title"
    assert result.description == "Updated description"
    # Ingredients and steps should remain unchanged
    assert len(result.ingredients) == 1


@pytest.mark.asyncio
@pytest.mark.unit
async def test_update_recipe_not_found(mock_db):
    """Test updating a non-existent recipe raises 404."""
    fake_id = uuid.uuid4()
    update_data = RecipeUpdate(title="New Title")

    with pytest.raises(HTTPException) as exc_info:
        await update_recipe(fake_id, update_data, mock_db)

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
@pytest.mark.unit
async def test_delete_recipe(mock_db):
    """Test deleting a recipe."""
    # Create a recipe
    created = await create_recipe(
        RecipeCreate(
            title="To Delete",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=1.0, unit=UnitEnum.KILOGRAM
                )
            ],
        ),
        mock_db,
    )

    # Delete it
    result = await delete_recipe(created.id, mock_db)

    assert result.success is True

    # Verify it's gone
    with pytest.raises(HTTPException) as exc_info:
        await get_recipe(created.id, mock_db)

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
@pytest.mark.unit
async def test_delete_recipe_not_found(mock_db):
    """Test deleting a non-existent recipe raises 404."""
    fake_id = uuid.uuid4()

    with pytest.raises(HTTPException) as exc_info:
        await delete_recipe(fake_id, mock_db)

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
@pytest.mark.unit
async def test_create_recipe_with_servings(mock_db):
    """Test creating a recipe with servings."""
    recipe_data = RecipeCreate(
        title="Servings Test Recipe",
        ingredients=[
            IngredientCreate(
                catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=500.0, unit=UnitEnum.GRAM
            ),
        ],
        servings=4,
    )

    result = await create_recipe(recipe_data, mock_db)

    assert result.title == "Servings Test Recipe"
    assert result.servings == 4


@pytest.mark.asyncio
@pytest.mark.unit
async def test_create_recipe_without_servings(mock_db):
    """Test creating a recipe without servings defaults to None."""
    recipe_data = RecipeCreate(
        title="No Servings Recipe",
        ingredients=[
            IngredientCreate(
                catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=1.0, unit=UnitEnum.KILOGRAM
            ),
        ],
    )

    result = await create_recipe(recipe_data, mock_db)

    assert result.servings is None


@pytest.mark.asyncio
@pytest.mark.unit
async def test_update_recipe_servings(mock_db):
    """Test updating servings on an existing recipe."""
    created = await create_recipe(
        RecipeCreate(
            title="Update Servings Recipe",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=1.0, unit=UnitEnum.KILOGRAM
                ),
            ],
            servings=2,
        ),
        mock_db,
    )

    result = await update_recipe(created.id, RecipeUpdate(servings=6), mock_db)

    assert result.servings == 6


@pytest.mark.asyncio
@pytest.mark.unit
async def test_create_recipe_with_category(mock_db):
    """Test creating a recipe with a category."""
    recipe_data = RecipeCreate(
        title="Category Test Recipe",
        ingredients=[
            IngredientCreate(
                catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=500.0, unit=UnitEnum.GRAM
            ),
        ],
        category=RecipeCategoryEnum.DESSERT,
    )

    result = await create_recipe(recipe_data, mock_db)

    assert result.title == "Category Test Recipe"
    assert result.category == RecipeCategoryEnum.DESSERT


@pytest.mark.asyncio
@pytest.mark.unit
async def test_create_recipe_without_category(mock_db):
    """Test creating a recipe without a category defaults to None."""
    recipe_data = RecipeCreate(
        title="No Category Recipe",
        ingredients=[
            IngredientCreate(
                catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=1.0, unit=UnitEnum.KILOGRAM
            ),
        ],
    )

    result = await create_recipe(recipe_data, mock_db)

    assert result.category is None


@pytest.mark.asyncio
@pytest.mark.unit
async def test_create_recipe_persists_category(mock_db):
    """Test that a created recipe's category is persisted and retrievable."""
    created = await create_recipe(
        RecipeCreate(
            title="Persisted Category Recipe",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=1.0, unit=UnitEnum.KILOGRAM
                )
            ],
            category=RecipeCategoryEnum.BREAKFAST,
        ),
        mock_db,
    )

    result = await get_recipe(created.id, mock_db)

    assert result.category == RecipeCategoryEnum.BREAKFAST


@pytest.mark.asyncio
@pytest.mark.unit
async def test_update_recipe_category(mock_db):
    """Test updating the category on an existing recipe."""
    created = await create_recipe(
        RecipeCreate(
            title="Update Category Recipe",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=1.0, unit=UnitEnum.KILOGRAM
                )
            ],
            category=RecipeCategoryEnum.SNACK,
        ),
        mock_db,
    )

    result = await update_recipe(
        created.id, RecipeUpdate(category=RecipeCategoryEnum.MAIN), mock_db
    )

    assert result.category == RecipeCategoryEnum.MAIN


@pytest.mark.asyncio
@pytest.mark.unit
async def test_update_recipe_clear_category_to_null(mock_db):
    """Explicitly sending category=None clears the category to uncategorized."""
    created = await create_recipe(
        RecipeCreate(
            title="Clear Category Recipe",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=1.0, unit=UnitEnum.KILOGRAM
                )
            ],
            category=RecipeCategoryEnum.DESSERT,
        ),
        mock_db,
    )

    result = await update_recipe(created.id, RecipeUpdate(category=None), mock_db)

    assert result.category is None


@pytest.mark.asyncio
@pytest.mark.unit
async def test_update_recipe_omitting_category_preserves_it(mock_db):
    """Omitting category from the update leaves the existing category unchanged."""
    created = await create_recipe(
        RecipeCreate(
            title="Preserve Category Recipe",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=1.0, unit=UnitEnum.KILOGRAM
                )
            ],
            category=RecipeCategoryEnum.SNACK,
        ),
        mock_db,
    )

    result = await update_recipe(created.id, RecipeUpdate(title="Renamed"), mock_db)

    assert result.title == "Renamed"
    assert result.category == RecipeCategoryEnum.SNACK


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_recipes_includes_category(mock_db):
    """Test that listed recipes include their category."""
    await create_recipe(
        RecipeCreate(
            title="Listed Category Recipe",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=1.0, unit=UnitEnum.KILOGRAM
                )
            ],
            category=RecipeCategoryEnum.BEVERAGE,
        ),
        mock_db,
    )

    result = await list_recipes(mock_db)

    assert result["total"] == 1
    assert result["data"][0].category == RecipeCategoryEnum.BEVERAGE


# ---- prep_time / calories / difficulty / image_url tests (#316) ----


@pytest.mark.asyncio
@pytest.mark.unit
async def test_create_recipe_with_new_fields(mock_db):
    """Creating a recipe persists prep_time, calories, difficulty and image_url."""
    result = await create_recipe(
        RecipeCreate(
            title="Full Detail Recipe",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=1.0, unit=UnitEnum.KILOGRAM
                )
            ],
            prep_time=25,
            calories=480,
            difficulty=RecipeDifficultyEnum.MEDIUM,
            image_url="https://example.com/cake.jpg",
        ),
        mock_db,
    )

    assert result.prep_time == 25
    assert result.calories == 480
    assert result.difficulty == RecipeDifficultyEnum.MEDIUM
    assert result.image_url == "https://example.com/cake.jpg"


@pytest.mark.asyncio
@pytest.mark.unit
async def test_create_recipe_without_new_fields_defaults_none(mock_db):
    """Omitting the new fields leaves them None (existing rows have no values)."""
    result = await create_recipe(
        RecipeCreate(
            title="Minimal Recipe",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=1.0, unit=UnitEnum.KILOGRAM
                )
            ],
        ),
        mock_db,
    )

    assert result.prep_time is None
    assert result.calories is None
    assert result.difficulty is None
    assert result.image_url is None


@pytest.mark.asyncio
@pytest.mark.unit
async def test_get_recipe_persists_new_fields(mock_db):
    """The new fields survive a round-trip through get_recipe."""
    created = await create_recipe(
        RecipeCreate(
            title="Persisted Detail Recipe",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=1.0, unit=UnitEnum.KILOGRAM
                )
            ],
            prep_time=10,
            calories=200,
            difficulty=RecipeDifficultyEnum.EASY,
            image_url="https://example.com/snack.png",
        ),
        mock_db,
    )

    result = await get_recipe(created.id, mock_db)

    assert result.prep_time == 10
    assert result.calories == 200
    assert result.difficulty == RecipeDifficultyEnum.EASY
    assert result.image_url == "https://example.com/snack.png"


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_recipes_includes_new_fields(mock_db):
    """Listed recipes expose the new fields."""
    await create_recipe(
        RecipeCreate(
            title="Listed Detail Recipe",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=1.0, unit=UnitEnum.KILOGRAM
                )
            ],
            prep_time=45,
            calories=650,
            difficulty=RecipeDifficultyEnum.HARD,
            image_url="https://example.com/main.jpg",
        ),
        mock_db,
    )

    result = await list_recipes(mock_db)

    assert result["total"] == 1
    row = result["data"][0]
    assert row.prep_time == 45
    assert row.calories == 650
    assert row.difficulty == RecipeDifficultyEnum.HARD
    assert row.image_url == "https://example.com/main.jpg"


@pytest.mark.asyncio
@pytest.mark.unit
async def test_update_recipe_new_fields(mock_db):
    """Updating prep_time, calories, difficulty and image_url applies new values."""
    created = await create_recipe(
        RecipeCreate(
            title="Update Detail Recipe",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=1.0, unit=UnitEnum.KILOGRAM
                )
            ],
            prep_time=15,
            calories=300,
            difficulty=RecipeDifficultyEnum.EASY,
            image_url="https://example.com/old.jpg",
        ),
        mock_db,
    )

    result = await update_recipe(
        created.id,
        RecipeUpdate(
            prep_time=30,
            calories=500,
            difficulty=RecipeDifficultyEnum.HARD,
            image_url="https://example.com/new.jpg",
        ),
        mock_db,
    )

    assert result.prep_time == 30
    assert result.calories == 500
    assert result.difficulty == RecipeDifficultyEnum.HARD
    assert result.image_url == "https://example.com/new.jpg"


@pytest.mark.asyncio
@pytest.mark.unit
async def test_update_recipe_clear_difficulty_and_image_to_null(mock_db):
    """Explicit null clears difficulty and image_url back to unset."""
    created = await create_recipe(
        RecipeCreate(
            title="Clear Detail Recipe",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=1.0, unit=UnitEnum.KILOGRAM
                )
            ],
            difficulty=RecipeDifficultyEnum.MEDIUM,
            image_url="https://example.com/clear.jpg",
        ),
        mock_db,
    )

    result = await update_recipe(created.id, RecipeUpdate(difficulty=None, image_url=None), mock_db)

    assert result.difficulty is None
    assert result.image_url is None


@pytest.mark.asyncio
@pytest.mark.unit
async def test_update_recipe_omitting_new_fields_preserves_them(mock_db):
    """Omitting the new fields leaves the existing values unchanged."""
    created = await create_recipe(
        RecipeCreate(
            title="Preserve Detail Recipe",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=1.0, unit=UnitEnum.KILOGRAM
                )
            ],
            prep_time=20,
            calories=400,
            difficulty=RecipeDifficultyEnum.MEDIUM,
            image_url="https://example.com/keep.jpg",
        ),
        mock_db,
    )

    result = await update_recipe(created.id, RecipeUpdate(title="Renamed Detail"), mock_db)

    assert result.title == "Renamed Detail"
    assert result.prep_time == 20
    assert result.calories == 400
    assert result.difficulty == RecipeDifficultyEnum.MEDIUM
    assert result.image_url == "https://example.com/keep.jpg"


async def _seed_categorized_recipes(mock_db):
    """Helper: create three recipes with distinct categories."""
    await create_recipe(
        RecipeCreate(
            title="Pancakes",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=1.0, unit=UnitEnum.KILOGRAM
                )
            ],
            category=RecipeCategoryEnum.BREAKFAST,
        ),
        mock_db,
    )
    await create_recipe(
        RecipeCreate(
            title="Brownies",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_CHOCOLATE, qty=200.0, unit=UnitEnum.GRAM
                )
            ],
            category=RecipeCategoryEnum.DESSERT,
        ),
        mock_db,
    )
    await create_recipe(
        RecipeCreate(
            title="Steak",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_SUGAR, qty=1.0, unit=UnitEnum.PIECE
                )
            ],
            category=RecipeCategoryEnum.MAIN,
        ),
        mock_db,
    )


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_recipes_filter_single_category(mock_db):
    """Single category filter returns only matching recipes."""
    await _seed_categorized_recipes(mock_db)

    result = await list_recipes(mock_db, category="breakfast")

    assert result["total"] == 1
    assert result["data"][0].title == "Pancakes"
    assert result["data"][0].category == RecipeCategoryEnum.BREAKFAST


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_recipes_filter_multiple_categories(mock_db):
    """Comma-separated category filter returns recipes in any of the categories."""
    await _seed_categorized_recipes(mock_db)

    result = await list_recipes(mock_db, category="breakfast,dessert")

    titles = {r.title for r in result["data"]}
    assert result["total"] == 2
    assert titles == {"Pancakes", "Brownies"}


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_recipes_no_category_filter_returns_all(mock_db):
    """No category filter returns all recipes (backward compatible)."""
    await _seed_categorized_recipes(mock_db)

    result = await list_recipes(mock_db)

    assert result["total"] == 3


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_recipes_invalid_category_returns_422(mock_db):
    """An invalid category value raises a 422 error."""
    await _seed_categorized_recipes(mock_db)

    with pytest.raises(HTTPException) as exc_info:
        await list_recipes(mock_db, category="not_a_category")

    assert exc_info.value.status_code == 422
    assert "Invalid category" in str(exc_info.value.detail)


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_recipes_invalid_category_among_valid_returns_422(mock_db):
    """A mix of valid and invalid category values still raises 422."""
    await _seed_categorized_recipes(mock_db)

    with pytest.raises(HTTPException) as exc_info:
        await list_recipes(mock_db, category="breakfast,bogus")

    assert exc_info.value.status_code == 422
    assert "bogus" in str(exc_info.value.detail)


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_recipes_category_cache_key_normalized(mock_db):
    """Category orderings/duplicates normalize to the same cache key."""
    with patch("services.recipes.crud.cache") as mock_cache:
        mock_cache.get_json.return_value = None

        await list_recipes(mock_db, category="dessert,breakfast")
        key1 = mock_cache.get_json.call_args[0][0]

        await list_recipes(mock_db, category="breakfast,dessert,breakfast")
        key2 = mock_cache.get_json.call_args[0][0]

    assert key1 == key2
    assert "category=breakfast,dessert" in key1


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_recipes_too_many_categories_returns_422(mock_db):
    """More distinct category values than exist is rejected (resource-amplification guard)."""
    # 8 distinct values > 7 valid enum members
    too_many = "a,b,c,d,e,f,g,h"

    with pytest.raises(HTTPException) as exc_info:
        await list_recipes(mock_db, category=too_many)

    assert exc_info.value.status_code == 422
    assert "Too many category" in str(exc_info.value.detail)


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_recipes_repeated_category_deduped(mock_db):
    """Repeated category values collapse and still filter correctly."""
    await _seed_categorized_recipes(mock_db)

    result = await list_recipes(mock_db, category="breakfast,breakfast,breakfast")

    assert result["total"] == 1
    assert result["data"][0].title == "Pancakes"


@pytest.mark.asyncio
@pytest.mark.unit
@pytest.mark.skip(
    reason="Ingredient filter uses JSONB which is not supported by SQLite test database"
)
async def test_list_recipes_with_ingredient_filter(mock_db):
    """Test filtering recipes by ingredient."""
    # Note: This test is skipped because JSONB filtering doesn't work with SQLite
    # It would work in integration tests with PostgreSQL
    pass


@pytest.mark.asyncio
@pytest.mark.unit
async def test_update_recipe_with_ingredients(mock_db):
    """Test updating a recipe with new ingredients."""
    # Create a recipe
    created = await create_recipe(
        RecipeCreate(
            title="Original Recipe",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=1.0, unit=UnitEnum.KILOGRAM
                )
            ],
        ),
        mock_db,
    )

    # Update with new ingredients
    update_data = RecipeUpdate(
        ingredients=[
            IngredientCreate(
                catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=2.0, unit=UnitEnum.KILOGRAM
            ),
            IngredientCreate(
                catalog_item_id=TEST_CATALOG_ITEM_SUGAR, qty=0.5, unit=UnitEnum.KILOGRAM
            ),
        ]
    )

    result = await update_recipe(created.id, update_data, mock_db)

    assert len(result.ingredients) == 2
    # Ingredients are stored as dicts in the database JSON field
    assert result.ingredients[0].qty == 2.0
    assert result.ingredients[1].catalog_item_id == TEST_CATALOG_ITEM_SUGAR


@pytest.mark.asyncio
@pytest.mark.unit
async def test_update_recipe_with_steps(mock_db):
    """Test updating a recipe with new steps."""
    # Create a recipe
    created = await create_recipe(
        RecipeCreate(
            title="Recipe with Steps",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=1.0, unit=UnitEnum.KILOGRAM
                )
            ],
            steps=["Step 1"],
        ),
        mock_db,
    )

    # Update with new steps
    update_data = RecipeUpdate(steps=["New Step 1", "New Step 2", "New Step 3"])

    result = await update_recipe(created.id, update_data, mock_db)

    assert len(result.steps) == 3
    assert result.steps[0] == "New Step 1"


@pytest.mark.asyncio
@pytest.mark.unit
async def test_update_recipe_duplicate_title(mock_db):
    """Test updating recipe to duplicate title raises error."""
    # Create two recipes
    await create_recipe(
        RecipeCreate(
            title="First Recipe",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=1.0, unit=UnitEnum.KILOGRAM
                )
            ],
        ),
        mock_db,
    )
    second = await create_recipe(
        RecipeCreate(
            title="Second Recipe",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_SUGAR, qty=1.0, unit=UnitEnum.KILOGRAM
                )
            ],
        ),
        mock_db,
    )

    # Try to update second recipe to have same title as first
    update_data = RecipeUpdate(title="First Recipe")

    with pytest.raises(HTTPException) as exc_info:
        await update_recipe(second.id, update_data, mock_db)

    assert exc_info.value.status_code == 400
    # IntegrityError message differs between SQLite (used in tests) and PostgreSQL (production)
    assert "Failed to update recipe" in str(exc_info.value.detail)


@pytest.mark.asyncio
@pytest.mark.unit
async def test_get_recipe_cache_hit_with_string_uuids(mock_db):
    """Cached data stores UUIDs as strings; get_recipe must convert them for auth."""
    from services.framework.user_context import require_user_context

    user_ctx = require_user_context()

    created = await create_recipe(
        RecipeCreate(
            title="Cache Test Recipe",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=1.0, unit=UnitEnum.KILOGRAM
                )
            ],
        ),
        mock_db,
    )

    cached_data = {
        "id": str(created.id),
        "title": "Cache Test Recipe",
        "normalized_title": "cache test recipe",
        "description": None,
        "servings": None,
        "ingredients": [
            {
                "catalog_item_id": str(TEST_CATALOG_ITEM_FLOUR),
                "catalog_item_name": "Test Item",
                "qty": 1.0,
                "unit": "kg",
            }
        ],
        "steps": None,
        "created_at": created.created_at.isoformat(),
        "updated_at": created.updated_at.isoformat(),
        "_user_id": str(user_ctx.user_id),
        "_group_id": str(user_ctx.group_ids[0]),
    }

    with patch("services.recipes.crud.cache") as mock_cache:
        mock_cache.get_json.return_value = cached_data
        result = await get_recipe(created.id, mock_db)

    assert result.title == "Cache Test Recipe"


@pytest.mark.asyncio
@pytest.mark.unit
async def test_category_counts_empty(mock_db):
    """No recipes yields empty counts."""
    result = await category_counts(mock_db)

    assert result == {"counts": {}}


@pytest.mark.asyncio
@pytest.mark.unit
async def test_category_counts_groups_by_category(mock_db):
    """Counts are grouped per category; uncategorized recipes are omitted."""
    await _seed_categorized_recipes(mock_db)
    # An extra dessert so a category has count > 1.
    await create_recipe(
        RecipeCreate(
            title="Cheesecake",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_VANILLA, qty=1.0, unit=UnitEnum.TEASPOON
                )
            ],
            category=RecipeCategoryEnum.DESSERT,
        ),
        mock_db,
    )
    # An uncategorized recipe that must not appear in the counts.
    await create_recipe(
        RecipeCreate(
            title="Mystery Dish",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=1.0, unit=UnitEnum.KILOGRAM
                )
            ],
        ),
        mock_db,
    )

    result = await category_counts(mock_db)

    assert result["counts"] == {"breakfast": 1, "dessert": 2, "main": 1}


@pytest.mark.asyncio
@pytest.mark.unit
async def test_category_counts_respects_search(mock_db):
    """The search param scopes counts to matching recipe titles."""
    await _seed_categorized_recipes(mock_db)
    await create_recipe(
        RecipeCreate(
            title="Banana Pancakes",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=1.0, unit=UnitEnum.KILOGRAM
                )
            ],
            category=RecipeCategoryEnum.BREAKFAST,
        ),
        mock_db,
    )

    result = await category_counts(mock_db, search="pancakes")

    assert result["counts"] == {"breakfast": 2}


@pytest.mark.asyncio
@pytest.mark.unit
async def test_category_counts_uses_cache(mock_db):
    """A cache hit short-circuits the DB query and returns the cached payload."""
    with patch("services.recipes.crud.cache") as mock_cache:
        mock_cache.get_json.return_value = {"counts": {"dessert": 3}}

        result = await category_counts(mock_db)

    assert result == {"counts": {"dessert": 3}}


@pytest.mark.asyncio
@pytest.mark.unit
async def test_category_counts_search_cache_key(mock_db):
    """The search value is part of the cache key so distinct searches don't collide."""
    with patch("services.recipes.crud.cache") as mock_cache:
        mock_cache.get_json.return_value = None

        await category_counts(mock_db, search="cake")
        key_with_search = mock_cache.get_json.call_args[0][0]

        await category_counts(mock_db)
        key_without_search = mock_cache.get_json.call_args[0][0]

    assert "s=cake" in key_with_search
    assert key_with_search != key_without_search


# ---- Stale group_id cleanup tests (#264) ----


@pytest.mark.asyncio
@pytest.mark.unit
async def test_cleanup_stale_group_ids_user_with_no_groups(mock_db):
    """User removed from all groups: group_id cleared on all their recipes."""
    from services.framework.user_context import set_user_context
    from services.recipes.models import Recipe as RecipeModel

    user_id = uuid.uuid4()
    old_group = uuid.uuid4()

    set_user_context(user_id=user_id, username="testuser", group_ids=[old_group])

    await create_recipe(
        RecipeCreate(
            title="Recipe A",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=1.0, unit=UnitEnum.KILOGRAM
                )
            ],
        ),
        mock_db,
    )

    row = mock_db.query(RecipeModel).filter(RecipeModel.user_id == user_id).first()
    assert row.group_id == old_group

    set_user_context(user_id=user_id, username="testuser", group_ids=[])
    await list_recipes(mock_db)

    mock_db.expire_all()
    row = mock_db.query(RecipeModel).filter(RecipeModel.user_id == user_id).first()
    assert row.group_id is None


@pytest.mark.asyncio
@pytest.mark.unit
async def test_cleanup_stale_group_ids_partial(mock_db):
    """User removed from group A but still in group B: only group A recipes cleared."""
    from services.framework.user_context import set_user_context
    from services.recipes.models import Recipe as RecipeModel

    user_id = uuid.uuid4()
    group_a = uuid.uuid4()
    group_b = uuid.uuid4()

    set_user_context(user_id=user_id, username="testuser", group_ids=[group_a])
    await create_recipe(
        RecipeCreate(
            title="Group A Recipe",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=1.0, unit=UnitEnum.KILOGRAM
                )
            ],
        ),
        mock_db,
    )

    row_a = (
        mock_db.query(RecipeModel).filter(RecipeModel.normalized_title == "group a recipe").first()
    )
    assert row_a.group_id == group_a

    set_user_context(user_id=user_id, username="testuser", group_ids=[group_b])
    await create_recipe(
        RecipeCreate(
            title="Group B Recipe",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_SUGAR, qty=1.0, unit=UnitEnum.KILOGRAM
                )
            ],
        ),
        mock_db,
    )

    mock_db.expire_all()
    row_a = (
        mock_db.query(RecipeModel).filter(RecipeModel.normalized_title == "group a recipe").first()
    )
    row_b = (
        mock_db.query(RecipeModel).filter(RecipeModel.normalized_title == "group b recipe").first()
    )
    assert row_a.group_id is None
    assert row_b.group_id == group_b


@pytest.mark.asyncio
@pytest.mark.unit
async def test_cleanup_stale_group_ids_invalidates_cache(mock_db):
    """Cache is invalidated when stale group_ids are cleaned up."""
    from services.framework.user_context import set_user_context

    user_id = uuid.uuid4()
    old_group = uuid.uuid4()

    set_user_context(user_id=user_id, username="testuser", group_ids=[old_group])
    await create_recipe(
        RecipeCreate(
            title="Cache Test",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=1.0, unit=UnitEnum.KILOGRAM
                )
            ],
        ),
        mock_db,
    )

    set_user_context(user_id=user_id, username="testuser", group_ids=[])

    with patch("services.recipes.crud.cache") as mock_cache:
        mock_cache.get_json.return_value = None
        await list_recipes(mock_db)
        mock_cache.delete_pattern.assert_any_call("recipes:*")


@pytest.mark.asyncio
@pytest.mark.unit
async def test_cleanup_stale_group_ids_noop_when_current(mock_db):
    """No cleanup when all recipe group_ids match the user's current groups."""
    from services.framework.user_context import set_user_context

    user_id = uuid.uuid4()
    group = uuid.uuid4()

    set_user_context(user_id=user_id, username="testuser", group_ids=[group])
    await create_recipe(
        RecipeCreate(
            title="Current Group Recipe",
            ingredients=[
                IngredientCreate(
                    catalog_item_id=TEST_CATALOG_ITEM_FLOUR, qty=1.0, unit=UnitEnum.KILOGRAM
                )
            ],
        ),
        mock_db,
    )

    with patch("services.recipes.crud.cache") as mock_cache:
        mock_cache.get_json.return_value = None
        await list_recipes(mock_db)
        for call in mock_cache.delete_pattern.call_args_list:
            assert call[0][0] != "recipes:*"
