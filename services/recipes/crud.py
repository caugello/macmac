from uuid import UUID

from fastapi import HTTPException
from pydantic import UUID4
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from services.config import get_config, get_config_for_service
from services.framework.logging import Span
from services.framework.tracing import traced
from services.framework.user_context import require_user_context
from services.shared.lib.authorization import (
    apply_ownership_filter,
    check_owner_only,
    check_owner_or_group,
)
from services.shared.lib.cache import initialize_service_cache
from services.shared.lib.crud_helpers import apply_pagination, apply_sorting
from services.shared.lib.http_client import service_request
from services.shared.schemas import recipe as rs
from services.shared.schemas.generic import DeleteResponse
from services.shared.schemas.ingredient import IngredientOut

from .models import Recipe, RecipeIngredient

# Load configuration
config = get_config()

# Initialize cache
cache = initialize_service_cache("recipes")


async def batch_fetch_catalog_items(catalog_item_ids: list[UUID4]) -> dict[str, dict]:
    """
    Batch fetch catalog items by IDs using the catalog batch endpoint.
    Returns dict mapping catalog_item_id (str) -> item data dict.
    """
    if not catalog_item_ids:
        return {}

    catalog_config = get_config_for_service("catalog")
    catalog_url = catalog_config.url

    try:
        response = await service_request(
            "POST",
            f"{catalog_url}/catalog/batch",
            json={"ids": [str(item_id) for item_id in catalog_item_ids]},
        )
        response.raise_for_status()
        return response.json().get("items", {})
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching catalog items: {str(e)}"
        ) from e


async def validate_catalog_items(catalog_item_ids: list[UUID4]) -> dict[UUID4, str]:
    """
    Validate that catalog items exist and return their names.
    Returns dict mapping catalog_item_id -> canonical_name
    Raises HTTPException if any item doesn't exist.
    """
    items = await batch_fetch_catalog_items(catalog_item_ids)

    item_names = {}
    for item_id in catalog_item_ids:
        item = items.get(str(item_id))
        if not item:
            raise HTTPException(
                status_code=400,
                detail=f"Catalog item {item_id} not found. All ingredients must exist in catalog.",
            )
        item_names[item_id] = item.get("canonical_name") or item.get("raw_name")

    return item_names


@traced
async def create_recipe(data: rs.RecipeCreate, db: Session):
    """
    Creates a new recipe in the database with catalog-linked ingredients.
    """
    user_ctx = require_user_context()

    with Span("db_create_recipe"):
        # Step 1: Validate all catalog items exist
        catalog_item_ids = [ing.catalog_item_id for ing in data.ingredients]
        item_names = await validate_catalog_items(catalog_item_ids)

        # Step 2: Create recipe
        normalized_title = data.title.strip().lower()

        # Automatic sharing: if user has groups, share with first group
        group_id = user_ctx.group_ids[0] if user_ctx.group_ids else None

        recipe = Recipe(
            title=data.title,
            normalized_title=normalized_title,
            description=data.description,
            steps=data.steps,
            user_id=user_ctx.user_id,
            group_id=group_id,
        )

        db.add(recipe)
        try:
            db.flush()  # Get recipe.id before creating ingredients
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail=f"Recipe '{data.title}' already exists. {exc.detail}",
            ) from exc

        # Step 3: Create recipe ingredients
        for ing in data.ingredients:
            recipe_ing = RecipeIngredient(
                recipe_id=recipe.id,
                catalog_item_id=ing.catalog_item_id,
                qty=ing.qty,
                unit=ing.unit.value,
            )
            db.add(recipe_ing)

        db.commit()
        db.refresh(recipe)

        # Invalidate list caches
        cache.delete_pattern("recipes:list:*")

        # Step 4: Build response with ingredient details
        ingredients_out = [
            IngredientOut(
                catalog_item_id=ing.catalog_item_id,
                catalog_item_name=item_names[ing.catalog_item_id],
                qty=ing.qty,
                unit=ing.unit,
            )
            for ing in data.ingredients
        ]

        return rs.RecipeOut(
            id=recipe.id,
            title=recipe.title,
            normalized_title=recipe.normalized_title,
            description=recipe.description,
            ingredients=ingredients_out,
            steps=recipe.steps,
            created_at=recipe.created_at,
            updated_at=recipe.updated_at,
        )


@traced
async def list_recipes(
    db: Session,
    limit: int = 20,
    offset: int = 0,
    search: str | None = None,
    ingredient: str | None = None,
    sort: str | None = None,
):
    """
    Lists recipes with optional filtering, searching, and sorting.
    Filters by user_id OR group_id for data isolation.
    Caches list results for 2 minutes per user.
    """
    user_ctx = require_user_context()

    # Build cache key from query params + user_id + group_ids (user-specific cache)
    groups_key = ",".join(sorted(str(g) for g in user_ctx.group_ids))
    cache_key = f"recipes:list:u={user_ctx.user_id}:g={groups_key}:l={limit}:o={offset}:s={search or ''}:i={ingredient or ''}:sort={sort or ''}"
    cached = cache.get_json(cache_key)
    if cached:
        return cached

    with Span("db_list_recipes"):
        query = db.query(Recipe)

        # AUTHORIZATION FILTER: user's own recipes OR group-shared recipes
        query = apply_ownership_filter(query, Recipe)

        # ---- TEXT SEARCH (case-insensitive)
        if search:
            s = f"%{search.lower()}%"
            query = query.filter(Recipe.normalized_title.ilike(s))

        # ---- INGREDIENT FILTER (by catalog_item_id)
        if ingredient:
            # Filter recipes that have this catalog_item_id
            query = query.join(RecipeIngredient).filter(
                RecipeIngredient.catalog_item_id == ingredient
            )

        # ---- SORTING
        query = apply_sorting(query, Recipe, sort)

        # ---- PAGINATION
        total, recipes = apply_pagination(query, limit, offset)

        # Batch fetch all catalog item names in one call
        all_catalog_ids = list(
            {ing.catalog_item_id for recipe in recipes for ing in recipe.recipe_ingredients}
        )
        catalog_items = await batch_fetch_catalog_items(all_catalog_ids)

        recipe_outs = []
        for recipe in recipes:
            ingredients_out = []
            for ing in recipe.recipe_ingredients:
                item = catalog_items.get(str(ing.catalog_item_id))
                item_name = (
                    (item.get("canonical_name") or item.get("raw_name"))
                    if item
                    else f"Unknown ({ing.catalog_item_id})"
                )
                ingredients_out.append(
                    IngredientOut(
                        catalog_item_id=ing.catalog_item_id,
                        catalog_item_name=item_name,
                        qty=ing.qty,
                        unit=ing.unit,
                    )
                )

            recipe_outs.append(
                rs.RecipeOut(
                    id=recipe.id,
                    title=recipe.title,
                    normalized_title=recipe.normalized_title,
                    description=recipe.description,
                    ingredients=ingredients_out,
                    steps=recipe.steps,
                    created_at=recipe.created_at,
                    updated_at=recipe.updated_at,
                )
            )

        # Return with metadata
        result = {
            "total": total,
            "limit": limit,
            "offset": offset,
            "data": recipe_outs,
        }

        # Cache for configured TTL
        cache.set_json(cache_key, result, ttl=config.cache.ttl.recipes_list)

        return result


@traced
async def get_recipe(recipe_id: UUID4, db: Session) -> rs.RecipeOut:
    """
    Retrieves a single recipe by its ID with caching.
    Verifies user has access (owner or group member).
    """
    require_user_context()

    # Try cache first — cached data includes user_id/group_id for auth check
    cache_key = f"recipe:{recipe_id}"
    cached = cache.get_json(cache_key)
    if cached:
        uid = cached.pop("_user_id", None)
        gid = cached.pop("_group_id", None)
        check_owner_or_group(UUID(uid) if uid else None, UUID(gid) if gid else None, "recipe")
        return rs.RecipeOut(**cached)

    with Span("db_query_recipe"):
        recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
        if not recipe:
            raise HTTPException(404, "Recipe not found")

        # AUTHORIZATION CHECK
        check_owner_or_group(recipe.user_id, recipe.group_id, "recipe")

        # Batch fetch catalog item names
        catalog_ids = [ing.catalog_item_id for ing in recipe.recipe_ingredients]
        catalog_items = await batch_fetch_catalog_items(catalog_ids)

        ingredients_out = []
        for ing in recipe.recipe_ingredients:
            item = catalog_items.get(str(ing.catalog_item_id))
            item_name = (
                (item.get("canonical_name") or item.get("raw_name"))
                if item
                else f"Unknown ({ing.catalog_item_id})"
            )
            ingredients_out.append(
                IngredientOut(
                    catalog_item_id=ing.catalog_item_id,
                    catalog_item_name=item_name,
                    qty=ing.qty,
                    unit=ing.unit,
                )
            )

        result = rs.RecipeOut(
            id=recipe.id,
            title=recipe.title,
            normalized_title=recipe.normalized_title,
            description=recipe.description,
            ingredients=ingredients_out,
            steps=recipe.steps,
            created_at=recipe.created_at,
            updated_at=recipe.updated_at,
        )

        # Cache with ownership info for authorization on cache hits
        cache_data = result.model_dump(mode="json")
        cache_data["_user_id"] = str(recipe.user_id) if recipe.user_id else None
        cache_data["_group_id"] = str(recipe.group_id) if recipe.group_id else None
        cache.set_json(cache_key, cache_data, ttl=config.cache.ttl.recipes_detail)

        return result


@traced
async def update_recipe(recipe_id: UUID4, data: rs.RecipeUpdate, db: Session):
    """
    Updates an existing recipe.
    Only the recipe owner can update.
    """
    require_user_context()

    with Span("db_update_recipe"):
        recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
        if not recipe:
            raise HTTPException(404, "Recipe not found")

        # AUTHORIZATION CHECK: only owner can update
        check_owner_only(recipe.user_id, "update")

        # Update basic fields
        if data.title is not None:
            recipe.title = data.title
            recipe.normalized_title = data.title.strip().lower()
        if data.description is not None:
            recipe.description = data.description
        if data.steps is not None:
            recipe.steps = data.steps

        # Update ingredients if provided
        if data.ingredients is not None:
            # Validate catalog items
            catalog_item_ids = [ing.catalog_item_id for ing in data.ingredients]
            await validate_catalog_items(catalog_item_ids)

            # Delete old ingredients
            db.query(RecipeIngredient).filter(RecipeIngredient.recipe_id == recipe_id).delete()

            # Create new ingredients
            for ing in data.ingredients:
                recipe_ing = RecipeIngredient(
                    recipe_id=recipe.id,
                    catalog_item_id=ing.catalog_item_id,
                    qty=ing.qty,
                    unit=ing.unit.value,
                )
                db.add(recipe_ing)

        try:
            db.commit()
            db.refresh(recipe)
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail=f"Failed to update recipe. {exc.detail}",
            ) from exc

        # Invalidate caches
        cache.delete(f"recipe:{recipe_id}")
        cache.delete_pattern("recipes:list:*")

        # Return updated recipe
        return await get_recipe(recipe_id, db)


@traced
async def delete_recipe(recipe_id: UUID4, db: Session):
    """
    Deletes a recipe from the database.
    Only the recipe owner can delete.
    """
    require_user_context()

    with Span("db_delete_recipe"):
        recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
        if not recipe:
            raise HTTPException(404, "Recipe not found")

        # AUTHORIZATION CHECK: only owner can delete
        check_owner_only(recipe.user_id, "delete")

        db.delete(recipe)
        db.commit()

        # Invalidate caches
        cache.delete(f"recipe:{recipe_id}")
        cache.delete_pattern("recipes:list:*")

        return DeleteResponse(success=True)


@traced
async def batch_get_recipes(data: rs.BatchRecipeRequest, db: Session) -> rs.BatchRecipeResponse:
    user_ctx = require_user_context()

    with Span("db_batch_recipes"):
        recipes = (
            db.query(Recipe)
            .filter(
                Recipe.id.in_(data.ids),
                or_(
                    Recipe.user_id == user_ctx.user_id,
                    Recipe.group_id.in_(user_ctx.group_ids) if user_ctx.group_ids else False,
                ),
            )
            .all()
        )

        all_catalog_ids = list(
            {ing.catalog_item_id for recipe in recipes for ing in recipe.recipe_ingredients}
        )
        catalog_items = await batch_fetch_catalog_items(all_catalog_ids)

        result = {}
        for recipe in recipes:
            ingredients_out = []
            for ing in recipe.recipe_ingredients:
                item = catalog_items.get(str(ing.catalog_item_id))
                item_name = (
                    (item.get("canonical_name") or item.get("raw_name"))
                    if item
                    else f"Unknown ({ing.catalog_item_id})"
                )
                ingredients_out.append(
                    IngredientOut(
                        catalog_item_id=ing.catalog_item_id,
                        catalog_item_name=item_name,
                        qty=ing.qty,
                        unit=ing.unit,
                    )
                )

            result[str(recipe.id)] = rs.RecipeOut(
                id=recipe.id,
                title=recipe.title,
                normalized_title=recipe.normalized_title,
                description=recipe.description,
                ingredients=ingredients_out,
                steps=recipe.steps,
                created_at=recipe.created_at,
                updated_at=recipe.updated_at,
            )

        return rs.BatchRecipeResponse(items=result)
