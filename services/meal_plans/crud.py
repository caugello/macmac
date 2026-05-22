import math
import uuid
from collections import defaultdict
from datetime import date, timedelta

from fastapi import HTTPException
from pydantic import UUID4
from sqlalchemy import and_, delete, or_
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
from services.shared.lib.crud_helpers import safe_commit
from services.shared.lib.http_client import service_request
from services.shared.lib.units import to_base_unit, to_display_unit
from services.shared.schemas import meal_plan as mp
from services.shared.schemas.generic import DeleteResponse

from .models import MealPlan, MealTypeEnum

# Load configuration
config = get_config()

# Initialize cache
cache = initialize_service_cache("meal_plans")


# ===== HELPER: FETCH RECIPE TITLES =====


async def fetch_recipe_titles(recipe_ids: list[UUID4]) -> dict[UUID4, str]:
    """Batch fetch recipe titles using POST /recipes/batch"""
    if not recipe_ids:
        return {}

    recipes_config = get_config_for_service("recipes")

    try:
        response = await service_request(
            "POST",
            f"{recipes_config.url}/recipes/batch",
            json={"ids": [str(rid) for rid in recipe_ids]},
        )
        response.raise_for_status()
        items = response.json().get("items", {})
        return {UUID4(k): v.get("title", "Unknown") for k, v in items.items()}
    except Exception:
        return {rid: f"Unknown ({rid})" for rid in recipe_ids}


# ===== CRUD OPERATIONS =====


@traced
async def create_meal_plan(data: mp.MealPlanCreate, db: Session) -> mp.MealPlanOut:
    """Schedule a recipe to a specific date+meal_type slot"""
    user_ctx = require_user_context()

    with Span("db_create_meal_plan"):
        # Fetch recipe title (don't block creation if recipes service has issues)
        titles = await fetch_recipe_titles([data.recipe_id])
        recipe_title = titles.get(data.recipe_id, "Unknown Recipe")

        # Automatic sharing: if user has groups, share with first group
        group_id = user_ctx.group_ids[0] if user_ctx.group_ids else None

        meal_plan = MealPlan(
            date=data.date,
            meal_type=data.meal_type.value,
            recipe_id=data.recipe_id,
            user_id=user_ctx.user_id,
            group_id=group_id,
        )

        with safe_commit(
            db,
            f"Meal slot already occupied for {data.date} {data.meal_type}. Delete existing entry first or use PATCH to update",
        ):
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

    # Build cache key from query params + user_id + group_ids (user-specific cache)
    groups_key = ",".join(sorted(str(g) for g in user_ctx.group_ids))
    cache_key = f"meal_plans:list:u={user_ctx.user_id}:g={groups_key}:sd={start_date}:ed={end_date}:l={limit}:o={offset}"
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
        recipe_ids = list({meal_plan.recipe_id for meal_plan in meal_plans})
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
    require_user_context()

    # Try cache first — cached data includes user_id/group_id for auth check
    cache_key = f"meal_plan:{meal_plan_id}"
    cached = cache.get_json(cache_key)
    if cached:
        uid = cached.pop("_user_id", None)
        gid = cached.pop("_group_id", None)
        check_owner_or_group(
            uuid.UUID(uid) if uid else None, uuid.UUID(gid) if gid else None, "meal plan"
        )
        return mp.MealPlanOut(**cached)

    with Span("db_get_meal_plan"):
        meal_plan = db.query(MealPlan).filter(MealPlan.id == meal_plan_id).first()
        if not meal_plan:
            raise HTTPException(404, "Meal plan not found")

        # AUTHORIZATION CHECK
        check_owner_or_group(meal_plan.user_id, meal_plan.group_id, "meal plan")

        titles = await fetch_recipe_titles([meal_plan.recipe_id])
        recipe_title = titles.get(meal_plan.recipe_id, f"Unknown ({meal_plan.recipe_id})")

        result = mp.MealPlanOut(
            id=meal_plan.id,
            date=meal_plan.date,
            meal_type=meal_plan.meal_type.value,
            recipe_id=meal_plan.recipe_id,
            recipe_title=recipe_title,
            created_at=meal_plan.created_at,
            updated_at=meal_plan.updated_at,
        )

        # Cache with ownership info for authorization on cache hits
        cache_data = result.model_dump(mode="json")
        cache_data["_user_id"] = str(meal_plan.user_id) if meal_plan.user_id else None
        cache_data["_group_id"] = str(meal_plan.group_id) if meal_plan.group_id else None
        cache.set_json(cache_key, cache_data, ttl=config.cache.ttl.meal_plans_detail)

        return result


@traced
async def update_meal_plan(
    meal_plan_id: UUID4,
    data: mp.MealPlanUpdate,
    db: Session,
) -> mp.MealPlanOut:
    """Update meal plan (change recipe, date, or meal_type). Only owner can update."""
    require_user_context()

    with Span("db_update_meal_plan"):
        meal_plan = db.query(MealPlan).filter(MealPlan.id == meal_plan_id).first()
        if not meal_plan:
            raise HTTPException(404, "Meal plan not found")

        # AUTHORIZATION CHECK: only owner can update
        check_owner_only(meal_plan.user_id, "update")

        if data.recipe_id is not None:
            meal_plan.recipe_id = data.recipe_id

        if data.date is not None:
            meal_plan.date = data.date
        if data.meal_type is not None:
            meal_plan.meal_type = MealTypeEnum(data.meal_type)

        with safe_commit(
            db, f"Cannot update: meal slot {meal_plan.date} {meal_plan.meal_type} already occupied"
        ):
            pass  # Changes already tracked by SQLAlchemy
        db.refresh(meal_plan)

        # Invalidate caches
        cache.delete(f"meal_plan:{meal_plan_id}")
        cache.delete_pattern("meal_plans:list:*")

        return await get_meal_plan(meal_plan_id, db)


@traced
async def delete_meal_plan(meal_plan_id: UUID4, db: Session) -> DeleteResponse:
    """Delete a meal plan (clear a meal slot). Only owner can delete."""
    require_user_context()

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
        source_meals = (
            db.query(MealPlan)
            .filter(
                and_(
                    MealPlan.date == data.source_date,
                    or_(
                        MealPlan.user_id == user_ctx.user_id,
                        MealPlan.group_id.in_(user_ctx.group_ids) if user_ctx.group_ids else False,
                    ),
                )
            )
            .all()
        )

        if not source_meals:
            raise HTTPException(404, f"No meals found for {data.source_date}")

        # Delete existing target meals (only user's own meals)
        db.execute(
            delete(MealPlan).where(
                and_(MealPlan.date == data.target_date, MealPlan.user_id == user_ctx.user_id)
            )
        )

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
                        MealPlan.group_id.in_(user_ctx.group_ids) if user_ctx.group_ids else False,
                    ),
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
                    MealPlan.user_id == user_ctx.user_id,
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
                        MealPlan.group_id.in_(user_ctx.group_ids) if user_ctx.group_ids else False,
                    ),
                )
            )
            .all()
        )

        if not meal_plans:
            raise HTTPException(
                404, f"No meals found between {data.start_date} and {data.end_date}"
            )

        # Fetch all recipes
        recipe_ids = list({meal_plan.recipe_id for meal_plan in meal_plans})
        recipes_config = get_config_for_service("recipes")
        catalog_config = get_config_for_service("catalog")

        # Step 1: Batch fetch all recipe details (with ingredients)
        recipes_by_id: dict[str, dict] = {}
        try:
            response = await service_request(
                "POST",
                f"{recipes_config.url}/recipes/batch",
                json={"ids": [str(rid) for rid in recipe_ids]},
            )
            response.raise_for_status()
            recipes_by_id = response.json().get("items", {})
        except Exception:
            pass

        # Step 2: Aggregate ingredients by (catalog_item_id, base_unit)
        # Iterate over every meal plan entry so the same recipe scheduled
        # multiple times has its ingredients counted each time.
        ingredient_totals: dict[tuple[uuid.UUID, str], dict] = {}

        for meal_plan in meal_plans:
            recipe = recipes_by_id.get(str(meal_plan.recipe_id))
            if not recipe:
                continue
            for ingredient in recipe.get("ingredients", []):
                catalog_item_id = uuid.UUID(ingredient["catalog_item_id"])
                qty = ingredient["qty"]
                unit = ingredient["unit"]

                base_qty, base_unit = to_base_unit(qty, unit)
                key = (catalog_item_id, base_unit)
                if key not in ingredient_totals:
                    ingredient_totals[key] = {"qty": 0.0, "unit": base_unit}
                ingredient_totals[key]["qty"] += base_qty

        # Convert aggregated base units back to display units
        for key in ingredient_totals:
            totals = ingredient_totals[key]
            display_qty, display_unit = to_display_unit(totals["qty"], totals["unit"])
            totals["qty"] = round(display_qty, 1)
            totals["unit"] = display_unit

        # Step 3: Batch fetch catalog item details (price, name, category)
        all_catalog_ids = list({cid for cid, _ in ingredient_totals.keys()})
        catalog_items = {}
        try:
            response = await service_request(
                "POST",
                f"{catalog_config.url}/catalog/batch",
                json={"ids": [str(cid) for cid in all_catalog_ids]},
            )
            response.raise_for_status()
            catalog_items = response.json().get("items", {})
        except Exception:
            pass

        shopping_items = []
        total_price = 0.0

        for (catalog_item_id, _base_unit), totals in ingredient_totals.items():
            catalog_item = catalog_items.get(str(catalog_item_id))
            if catalog_item:
                price = catalog_item.get("price")
                line_total = None
                package_size = None
                package_unit = None
                packages_needed = None

                if price is not None:
                    net_qty = catalog_item.get("net_quantity_value")
                    net_unit = catalog_item.get("net_quantity_unit")
                    if net_qty and net_qty > 0:
                        base_need, base_need_unit = to_base_unit(totals["qty"], totals["unit"])
                        base_pkg, base_pkg_unit = to_base_unit(net_qty, net_unit or totals["unit"])
                        if base_need_unit == base_pkg_unit:
                            packages_needed = math.ceil(base_need / base_pkg)
                            package_size = net_qty
                            package_unit = net_unit
                            line_total = price * packages_needed
                        else:
                            line_total = price
                    else:
                        line_total = price
                if line_total is not None:
                    total_price += line_total

                is_on_promotion = False
                promotion_until_date = None
                raw_promo = catalog_item.get("promotion_until_date")
                if raw_promo:
                    try:
                        promo_date = (
                            date.fromisoformat(raw_promo)
                            if isinstance(raw_promo, str)
                            else raw_promo
                        )
                        if promo_date >= date.today():
                            is_on_promotion = True
                            promotion_until_date = promo_date
                    except (ValueError, TypeError):
                        pass

                shopping_items.append(
                    mp.ShoppingListItem(
                        catalog_item_id=catalog_item_id,
                        catalog_item_name=catalog_item.get("canonical_name")
                        or catalog_item.get("raw_name"),
                        total_qty=totals["qty"],
                        unit=totals["unit"],
                        price=price,
                        line_total=round(line_total, 2) if line_total is not None else None,
                        category=catalog_item.get("category"),
                        is_on_promotion=is_on_promotion,
                        promotion_until_date=promotion_until_date,
                        package_size=package_size,
                        package_unit=package_unit,
                        packages_needed=packages_needed,
                    )
                )
            else:
                shopping_items.append(
                    mp.ShoppingListItem(
                        catalog_item_id=catalog_item_id,
                        catalog_item_name=f"Unknown ({catalog_item_id})",
                        total_qty=totals["qty"],
                        unit=totals["unit"],
                        price=None,
                        line_total=None,
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
