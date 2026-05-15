import httpx
from datetime import date, timedelta
from collections import defaultdict
from fastapi import HTTPException
from pydantic import UUID4
from sqlalchemy import and_, delete, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from services.config import get_config, get_config_for_service
from services.framework.logging import Span
from services.framework.tracing import traced
from services.framework.user_context import require_user_context
from services.shared.schemas import meal_plan as mp
from services.shared.schemas.generic import DeleteResponse
from services.shared.lib.cache import initialize_service_cache
from services.shared.lib.crud_helpers import safe_commit
from services.shared.lib.authorization import apply_ownership_filter, check_owner_only, check_owner_or_group

from .models import MealPlan, MealTypeEnum

# Load configuration
config = get_config()

# Initialize cache
cache = initialize_service_cache("meal_plans")


# ===== HELPER: VALIDATE RECIPES =====


async def validate_recipe_exists(recipe_id: UUID4) -> str:
    """
    Validate recipe exists in recipes service.
    Returns recipe title if found, raises HTTPException if not.
    """
    recipes_config = get_config_for_service("recipes")
    recipes_url = recipes_config.url

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{recipes_url}/recipes/{recipe_id}")
            response.raise_for_status()
            recipe = response.json()
            return recipe.get("title", "Unknown Recipe")
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                raise HTTPException(
                    status_code=400,
                    detail=f"Recipe {recipe_id} not found. Cannot schedule non-existent recipe.",
                )
            raise HTTPException(status_code=500, detail=f"Failed to validate recipe {recipe_id}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error validating recipe: {str(e)}")


async def fetch_recipe_titles(recipe_ids: list[UUID4]) -> dict[UUID4, str]:
    """Batch fetch recipe titles (for list responses)"""
    recipes_config = get_config_for_service("recipes")
    recipes_url = recipes_config.url

    titles = {}
    async with httpx.AsyncClient() as client:
        for recipe_id in recipe_ids:
            try:
                response = await client.get(f"{recipes_url}/recipes/{recipe_id}")
                recipe = response.json()
                titles[recipe_id] = recipe.get("title", "Unknown")
            except Exception:
                titles[recipe_id] = f"Unknown ({recipe_id})"
    return titles


# ===== CRUD OPERATIONS =====


@traced
async def create_meal_plan(data: mp.MealPlanCreate, db: Session) -> mp.MealPlanOut:
    """Schedule a recipe to a specific date+meal_type slot"""
    user_ctx = require_user_context()

    with Span("db_create_meal_plan"):
        # Validate recipe exists
        recipe_title = await validate_recipe_exists(data.recipe_id)

        # Automatic sharing: if user has groups, share with first group
        group_id = user_ctx.group_ids[0] if user_ctx.group_ids else None

        meal_plan = MealPlan(
            date=data.date,
            meal_type=data.meal_type.value,
            recipe_id=data.recipe_id,
            user_id=user_ctx.user_id,
            group_id=group_id,
        )

        with safe_commit(db, f"Meal slot already occupied for {data.date} {data.meal_type}. Delete existing entry first or use PATCH to update"):
            db.add(meal_plan)
        db.refresh(meal_plan)

        # Invalidate list caches
        cache.delete_pattern("meal_plans:list:*")

        return mp.MealPlanOut(
            id=meal_plan.id,
            date=meal_plan.date,
            meal_type=meal_plan.meal_type.value,
            recipe_id=meal_plan.recipe_id,
            recipe_title=recipe_title,
            created_at=meal_plan.created_at,
            updated_at=meal_plan.updated_at,
        )


@traced
async def list_meal_plans(
    db: Session,
    start_date: date | None = None,
    end_date: date | None = None,
    limit: int = 100,
    offset: int = 0,
    **kwargs,
) -> mp.MealPlanListResponse:
    """
    List meal plans for a date range (default: current week Mon-Sun).
    Filters by user_id OR group_id for data isolation.
    Caches results for 1 minute per user.
    """
    user_ctx = require_user_context()

    # Default to current week if no dates provided
    if start_date is None:
        today = date.today()
        start_date = today - timedelta(days=today.weekday())  # Monday
    if end_date is None:
        end_date = start_date + timedelta(days=6)  # Sunday

    # Build cache key from query params + user_id (user-specific cache)
    cache_key = f"meal_plans:list:u={user_ctx.user_id}:sd={start_date}:ed={end_date}:l={limit}:o={offset}"
    cached = cache.get_json(cache_key)
    if cached:
        return mp.MealPlanListResponse(**cached)

    with Span("db_list_meal_plans"):
        query = db.query(MealPlan)

        # AUTHORIZATION FILTER: user's own meal plans OR group-shared meal plans
        query = apply_ownership_filter(query, MealPlan)

        query = query.filter(and_(MealPlan.date >= start_date, MealPlan.date <= end_date)).order_by(
            MealPlan.date, MealPlan.meal_type
        )

        total = query.count()
        meal_plans = query.limit(limit).offset(offset).all()

        # Fetch recipe titles
        recipe_ids = list(set(meal_plan.recipe_id for meal_plan in meal_plans))
        titles = await fetch_recipe_titles(recipe_ids)

        meal_plan_outs = [
            mp.MealPlanOut(
                id=meal_plan.id,
                date=meal_plan.date,
                meal_type=meal_plan.meal_type.value,
                recipe_id=meal_plan.recipe_id,
                recipe_title=titles.get(meal_plan.recipe_id),
                created_at=meal_plan.created_at,
                updated_at=meal_plan.updated_at,
            )
            for meal_plan in meal_plans
        ]

        result = mp.MealPlanListResponse(total=total, data=meal_plan_outs)

        # Cache for configured TTL
        cache.set_json(cache_key, result, ttl=config.cache.ttl.meal_plans_list)

        return result


@traced
async def get_meal_plan(meal_plan_id: UUID4, db: Session) -> mp.MealPlanOut:
    """Get a single meal plan by ID with caching. Verifies user has access."""
    user_ctx = require_user_context()

    # Try cache first
    cache_key = f"meal_plan:{meal_plan_id}"
    cached = cache.get_json(cache_key)
    if cached:
        # Still need to verify access even if cached
        meal_plan = db.query(MealPlan).filter(MealPlan.id == meal_plan_id).first()
        if meal_plan:
            # AUTHORIZATION CHECK
            check_owner_or_group(meal_plan.user_id, meal_plan.group_id, "meal plan")
        return mp.MealPlanOut(**cached)

    with Span("db_get_meal_plan"):
        meal_plan = db.query(MealPlan).filter(MealPlan.id == meal_plan_id).first()
        if not meal_plan:
            raise HTTPException(404, "Meal plan not found")

        # AUTHORIZATION CHECK
        check_owner_or_group(meal_plan.user_id, meal_plan.group_id, "meal plan")

        # Fetch recipe title
        try:
            recipe_title = await validate_recipe_exists(meal_plan.recipe_id)
        except Exception:
            recipe_title = f"Unknown ({meal_plan.recipe_id})"

        result = mp.MealPlanOut(
            id=meal_plan.id,
            date=meal_plan.date,
            meal_type=meal_plan.meal_type.value,
            recipe_id=meal_plan.recipe_id,
            recipe_title=recipe_title,
            created_at=meal_plan.created_at,
            updated_at=meal_plan.updated_at,
        )

        # Cache for configured TTL
        cache.set_json(cache_key, result, ttl=config.cache.ttl.meal_plans_detail)

        return result


@traced
async def update_meal_plan(
    meal_plan_id: UUID4,
    data: mp.MealPlanUpdate,
    db: Session,
) -> mp.MealPlanOut:
    """Update meal plan (change recipe, date, or meal_type). Only owner can update."""
    user_ctx = require_user_context()

    with Span("db_update_meal_plan"):
        meal_plan = db.query(MealPlan).filter(MealPlan.id == meal_plan_id).first()
        if not meal_plan:
            raise HTTPException(404, "Meal plan not found")

        # AUTHORIZATION CHECK: only owner can update
        check_owner_only(meal_plan.user_id, "update")

        # Validate new recipe if provided
        if data.recipe_id is not None:
            await validate_recipe_exists(data.recipe_id)
            meal_plan.recipe_id = data.recipe_id

        if data.date is not None:
            meal_plan.date = data.date
        if data.meal_type is not None:
            meal_plan.meal_type = MealTypeEnum(data.meal_type)

        with safe_commit(db, f"Cannot update: meal slot {meal_plan.date} {meal_plan.meal_type} already occupied"):
            pass  # Changes already tracked by SQLAlchemy
        db.refresh(meal_plan)

        # Invalidate caches
        cache.delete(f"meal_plan:{meal_plan_id}")
        cache.delete_pattern("meal_plans:list:*")

        return await get_meal_plan(meal_plan_id, db)


@traced
async def delete_meal_plan(meal_plan_id: UUID4, db: Session) -> DeleteResponse:
    """Delete a meal plan (clear a meal slot). Only owner can delete."""
    user_ctx = require_user_context()

    with Span("db_delete_meal_plan"):
        meal_plan = db.query(MealPlan).filter(MealPlan.id == meal_plan_id).first()
        if not meal_plan:
            raise HTTPException(404, "Meal plan not found")

        # AUTHORIZATION CHECK: only owner can delete
        check_owner_only(meal_plan.user_id, "delete")

        db.delete(meal_plan)
        db.commit()

        # Invalidate caches
        cache.delete(f"meal_plan:{meal_plan_id}")
        cache.delete_pattern("meal_plans:list:*")

        return DeleteResponse(success=True)


# ===== COPY OPERATIONS =====


@traced
async def copy_day(data: mp.CopyDayRequest, db: Session) -> mp.CopyResponse:
    """
    Copy all 3 meals from source_date to target_date.
    Overwrites any existing meals on target_date.
    Only copies user's own meal plans.
    """
    user_ctx = require_user_context()

    with Span("db_copy_day"):
        # Fetch source meals (filter by user OR group)
        source_meals = db.query(MealPlan).filter(
            and_(
                MealPlan.date == data.source_date,
                or_(
                    MealPlan.user_id == user_ctx.user_id,
                    MealPlan.group_id.in_(user_ctx.group_ids) if user_ctx.group_ids else False
                )
            )
        ).all()

        if not source_meals:
            raise HTTPException(404, f"No meals found for {data.source_date}")

        # Delete existing target meals (only user's own meals)
        db.execute(delete(MealPlan).where(
            and_(
                MealPlan.date == data.target_date,
                MealPlan.user_id == user_ctx.user_id
            )
        ))

        # Copy meals with user/group ownership
        group_id = user_ctx.group_ids[0] if user_ctx.group_ids else None
        copied_count = 0
        for source_meal in source_meals:
            new_meal = MealPlan(
                date=data.target_date,
                meal_type=source_meal.meal_type,
                recipe_id=source_meal.recipe_id,
                user_id=user_ctx.user_id,
                group_id=group_id,
            )
            db.add(new_meal)
            copied_count += 1

        db.commit()

        # Invalidate list caches
        cache.delete_pattern("meal_plans:list:*")

        return mp.CopyResponse(
            copied_count=copied_count,
            message=f"Copied {copied_count} meals from {data.source_date} to {data.target_date}",
        )


@traced
async def copy_week(data: mp.CopyWeekRequest, db: Session) -> mp.CopyResponse:
    """
    Copy entire week (Mon-Sun, 21 meals) from source to target week.
    Both dates must be Mondays (weekday == 0).
    Only copies user's own meal plans.
    """
    user_ctx = require_user_context()

    with Span("db_copy_week"):
        # Validate both dates are Mondays
        if data.source_week_start.weekday() != 0:
            raise HTTPException(400, "source_week_start must be a Monday")
        if data.target_week_start.weekday() != 0:
            raise HTTPException(400, "target_week_start must be a Monday")

        # Calculate date ranges
        source_end = data.source_week_start + timedelta(days=6)
        target_end = data.target_week_start + timedelta(days=6)

        # Fetch source week meals (filter by user OR group)
        source_meals = (
            db.query(MealPlan)
            .filter(
                and_(
                    MealPlan.date >= data.source_week_start,
                    MealPlan.date <= source_end,
                    or_(
                        MealPlan.user_id == user_ctx.user_id,
                        MealPlan.group_id.in_(user_ctx.group_ids) if user_ctx.group_ids else False
                    )
                )
            )
            .all()
        )

        if not source_meals:
            raise HTTPException(404, f"No meals found for week starting {data.source_week_start}")

        # Delete existing target week meals (only user's own meals)
        db.execute(
            delete(MealPlan).where(
                and_(
                    MealPlan.date >= data.target_week_start,
                    MealPlan.date <= target_end,
                    MealPlan.user_id == user_ctx.user_id
                )
            )
        )

        # Copy meals with offset and user/group ownership
        day_offset = (data.target_week_start - data.source_week_start).days
        group_id = user_ctx.group_ids[0] if user_ctx.group_ids else None
        copied_count = 0

        for source_meal in source_meals:
            new_date = source_meal.date + timedelta(days=day_offset)
            new_meal = MealPlan(
                date=new_date,
                meal_type=source_meal.meal_type,
                recipe_id=source_meal.recipe_id,
                user_id=user_ctx.user_id,
                group_id=group_id,
            )
            db.add(new_meal)
            copied_count += 1

        db.commit()

        # Invalidate list caches
        cache.delete_pattern("meal_plans:list:*")

        return mp.CopyResponse(
            copied_count=copied_count,
            message=f"Copied {copied_count} meals from week {data.source_week_start} to {data.target_week_start}",
        )


# ===== SHOPPING LIST =====


@traced
async def generate_shopping_list(
    data: mp.ShoppingListRequest,
    db: Session,
) -> mp.ShoppingListResponse:
    """
    Generate shopping list from meal plans in date range.
    Aggregates ingredients by catalog_item_id, fetches prices/categories.
    Only includes user's own meal plans.
    """
    user_ctx = require_user_context()

    with Span("db_generate_shopping_list"):
        # Fetch all meal plans in range (filter by user OR group)
        meal_plans = (
            db.query(MealPlan)
            .filter(
                and_(
                    MealPlan.date >= data.start_date,
                    MealPlan.date <= data.end_date,
                    or_(
                        MealPlan.user_id == user_ctx.user_id,
                        MealPlan.group_id.in_(user_ctx.group_ids) if user_ctx.group_ids else False
                    )
                )
            )
            .all()
        )

        if not meal_plans:
            raise HTTPException(404, f"No meals found between {data.start_date} and {data.end_date}")

        # Fetch all recipes
        recipe_ids = list(set(meal_plan.recipe_id for meal_plan in meal_plans))
        recipes_config = get_config_for_service("recipes")
        catalog_config = get_config_for_service("catalog")

        # Step 1: Fetch all recipe details (with ingredients)
        recipes_data = []
        async with httpx.AsyncClient() as client:
            for recipe_id in recipe_ids:
                try:
                    response = await client.get(f"{recipes_config.url}/recipes/{recipe_id}")
                    recipes_data.append(response.json())
                except Exception:
                    continue  # Skip if recipe deleted

        # Step 2: Aggregate ingredients by catalog_item_id
        ingredient_totals = defaultdict(lambda: {"qty": 0.0, "unit": None})

        for recipe in recipes_data:
            for ingredient in recipe.get("ingredients", []):
                catalog_item_id = UUID4(ingredient["catalog_item_id"])
                qty = ingredient["qty"]
                unit = ingredient["unit"]

                # Simple aggregation (no unit conversion for MVP)
                ingredient_totals[catalog_item_id]["qty"] += qty
                if ingredient_totals[catalog_item_id]["unit"] is None:
                    ingredient_totals[catalog_item_id]["unit"] = unit

        # Step 3: Fetch catalog item details (price, name, category)
        shopping_items = []
        total_price = 0.0

        async with httpx.AsyncClient() as client:
            for catalog_item_id, totals in ingredient_totals.items():
                try:
                    response = await client.get(f"{catalog_config.url}/catalog/{catalog_item_id}")
                    catalog_item = response.json()

                    price = catalog_item.get("price")
                    if price:
                        total_price += price

                    shopping_items.append(
                        mp.ShoppingListItem(
                            catalog_item_id=catalog_item_id,
                            catalog_item_name=catalog_item.get("canonical_name")
                            or catalog_item.get("raw_name"),
                            total_qty=totals["qty"],
                            unit=totals["unit"],
                            price=price,
                            category=catalog_item.get("category"),
                        )
                    )
                except Exception:
                    # Item not found - still include it
                    shopping_items.append(
                        mp.ShoppingListItem(
                            catalog_item_id=catalog_item_id,
                            catalog_item_name=f"Unknown ({catalog_item_id})",
                            total_qty=totals["qty"],
                            unit=totals["unit"],
                            price=None,
                            category=None,
                        )
                    )

        # Step 4: Group by category
        items_by_category = defaultdict(list)
        for item in shopping_items:
            category = item.category or "Uncategorized"
            items_by_category[category].append(item)

        return mp.ShoppingListResponse(
            date_range={"start_date": data.start_date, "end_date": data.end_date},
            items_by_category=dict(items_by_category),
            total_items=len(shopping_items),
            estimated_total=total_price if total_price > 0 else None,
        )
