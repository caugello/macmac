from datetime import UTC, datetime, timedelta

from fastapi import HTTPException
from pydantic import UUID4
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from services.config import get_config
from services.framework.logging import Span
from services.framework.tracing import traced
from services.shared.lib.cache import initialize_service_cache
from services.shared.lib.catalog_taxonomy import TAXONOMY
from services.shared.lib.crud_helpers import apply_pagination, apply_sorting, safe_commit
from services.shared.schemas import catalog as rs

from .models import CatalogItem

HTTPX_TIMEOUT = 30.0

# Load configuration
config = get_config()

# Initialize cache
cache = initialize_service_cache("catalog")


@traced
async def create_catalog_item(data: rs.CatalogItemCreate, db: Session):
    """
    Creates a new catalog item in the database.
    """

    with Span("db_create_catalog_item"):
        item = CatalogItem(
            vendor_name=data.vendor_name,
            vendor_product_id=data.vendor_product_id,
            raw_name=data.raw_name,
            normalized_name=data.normalized_name,
            canonical_name=data.canonical_name,
            brand=data.brand,
            net_quantity_value=data.net_quantity_value,
            net_quantity_unit=data.net_quantity_unit,
            product_url=data.product_url,
            is_food=data.is_food,
            price=data.price,
            unit_price=data.unit_price,
            unit_price_unit=data.unit_price_unit,
            currency=data.currency,
            category=data.category,
            nutrition=data.nutrition,
            nutriscore=data.nutriscore,
            nutriscore_svg=data.nutriscore_svg,
            promotion_until_date=data.promotion_until_date,
            image_url=data.image_url,
        )

        with safe_commit(db, f"CatalogItem '{data.product_url}' already exists"):
            db.add(item)
        db.refresh(item)

        # Invalidate list caches and the count-sensitive departments cache.
        cache.delete_pattern("catalog:list:*")
        cache.delete("catalog:departments")

        return rs.CatalogItemOut.model_validate(item)


@traced
async def list_catalog_items(
    db: Session,
    limit: int = 20,
    offset: int = 0,
    search: str | None = None,
    sort: str | None = None,
    category: str | None = None,
    is_food: bool | None = None,
):
    """
    Lists catalog items with optional filtering, searching, and sorting.
    Caches results for 5 minutes.
    """
    # Build cache key from query params
    is_food_str = "" if is_food is None else str(is_food)
    cache_key = (
        f"catalog:list:l={limit}:o={offset}:s={search or ''}:sort={sort or ''}"
        f":c={category or ''}:f={is_food_str}"
    )
    cached = cache.get_json(cache_key)
    if cached:
        return cached

    with Span("db_list_catalog_items"):
        query = db.query(CatalogItem)

        # ---- TEXT SEARCH (case-insensitive)
        # Match against normalized_name, raw_name, and brand so brand-based
        # searches (e.g. "coca") work even when the enricher strips the brand
        # out of normalized_name.
        if search:
            s = f"%{search.lower()}%"
            query = query.filter(
                or_(
                    CatalogItem.canonical_name.ilike(s),
                    CatalogItem.normalized_name.ilike(s),
                    CatalogItem.raw_name.ilike(s),
                    CatalogItem.brand.ilike(s),
                )
            )

        # ---- CATEGORY FILTER
        if category:
            query = query.filter(CatalogItem.category == category)

        # ---- FOOD/NON-FOOD FILTER
        if is_food is not None:
            query = query.filter(CatalogItem.is_food == is_food)

        # ---- SORTING
        query = apply_sorting(query, CatalogItem, sort)

        # ---- PAGINATION
        total, items = apply_pagination(query, limit, offset)

        # Return with metadata
        result = {
            "total": total,
            "limit": limit,
            "offset": offset,
            "data": [rs.CatalogItemOut.model_validate(r) for r in items],
        }

        # Cache for configured TTL
        cache.set_json(cache_key, result, ttl=config.cache.ttl.catalog_list)

        return result


@traced
async def list_catalog_categories(db: Session) -> rs.CatalogCategoriesResponse:
    cache_key = "catalog:categories"
    cached = cache.get_json(cache_key)
    if cached:
        return rs.CatalogCategoriesResponse(**cached)

    with Span("db_list_catalog_categories"):
        rows = (
            db.query(CatalogItem.category)
            .filter(CatalogItem.category.isnot(None))
            .distinct()
            .order_by(CatalogItem.category)
            .all()
        )
        result = rs.CatalogCategoriesResponse(categories=[r[0] for r in rows])
        cache.set_json(cache_key, result, ttl=config.cache.ttl.catalog_list)
        return result


@traced
async def list_catalog_departments(db: Session) -> rs.CatalogDepartmentsResponse:
    """Return the 2-level taxonomy with live per-category counts.

    A single ``GROUP BY category`` over the catalog is folded into the static
    taxonomy constant. All 8 departments / 36 categories are always returned in
    taxonomy order (count 0 when no items) so the department rail stays stable.
    Categories not present in the taxonomy (e.g. legacy values awaiting
    re-enrichment) are ignored.
    """
    cache_key = "catalog:departments"
    cached = cache.get_json(cache_key)
    if cached:
        return rs.CatalogDepartmentsResponse(**cached)

    with Span("db_list_catalog_departments"):
        rows = (
            db.query(CatalogItem.category, func.count(CatalogItem.id))
            .filter(CatalogItem.category.isnot(None))
            .group_by(CatalogItem.category)
            .all()
        )
        counts = {str(category): count for category, count in rows}

        departments = []
        for name, (icon, categories) in TAXONOMY.items():
            category_models = [
                rs.CatalogDepartmentCategory(name=category, count=counts.get(category, 0))
                for category in categories
            ]
            departments.append(
                rs.CatalogDepartment(
                    name=name,
                    icon=icon,
                    count=sum(c.count for c in category_models),
                    categories=category_models,
                )
            )

        result = rs.CatalogDepartmentsResponse(departments=departments)
        cache.set_json(cache_key, result, ttl=config.cache.ttl.catalog_list)
        return result


@traced
async def get_catalog_stats(db: Session) -> rs.CatalogStatsResponse:
    """Enrichment-coverage counts the queues can't show.

    All counts are COUNT queries — no rows are loaded into memory. Freshness
    mirrors ``snitch.db.is_item_fresh``: enriched within the configured window
    AND complete (image + price, plus nutrition for food). The threshold is
    driven by ``enricher.freshness_threshold_days`` so it cannot drift from the
    snitch/re-enqueue definition.
    """
    enricher = config.services["catalog"].enricher
    freshness_days = enricher.freshness_threshold_days if enricher else 14
    cutoff = datetime.now(UTC) - timedelta(days=freshness_days)

    # "Complete" = has image + price, and (non-food, or food with nutrition).
    complete = and_(
        CatalogItem.image_url.isnot(None),
        CatalogItem.price.isnot(None),
        or_(CatalogItem.is_food.is_(False), CatalogItem.nutrition.isnot(None)),
    )
    fresh_filter = and_(
        CatalogItem.last_enriched_at.isnot(None),
        CatalogItem.last_enriched_at >= cutoff,
        complete,
    )

    with Span("db_catalog_stats"):

        def _count(*filters) -> int:
            query = db.query(func.count(CatalogItem.id))
            if filters:
                query = query.filter(*filters)
            return int(query.scalar() or 0)

        total = _count()
        fresh = _count(fresh_filter)
        return rs.CatalogStatsResponse(
            total=total,
            fresh=fresh,
            stale=total - fresh,
            missing_image_url=_count(CatalogItem.image_url.is_(None)),
            missing_nutrition=_count(CatalogItem.nutrition.is_(None)),
            missing_nutriscore=_count(CatalogItem.nutriscore.is_(None)),
        )


@traced
async def get_catalog_item(item_id: UUID4, db: Session) -> rs.CatalogItemOut:
    """
    Retrieves a single item by its ID with caching.
    """
    # Try cache first
    cache_key = f"catalog:{item_id}"
    cached = cache.get_json(cache_key)
    if cached:
        return rs.CatalogItemOut(**cached)

    with Span("db_query_catalog"):
        item = db.query(CatalogItem).filter(CatalogItem.id == item_id).first()
        if not item:
            raise HTTPException(404, "CatalogItem not found")

        result = rs.CatalogItemOut.model_validate(item)

        # Cache for configured TTL
        cache.set_json(cache_key, result, ttl=config.cache.ttl.catalog_detail)

        return result


@traced
async def batch_get_catalog_items(
    data: rs.BatchCatalogRequest, db: Session
) -> rs.BatchCatalogResponse:
    """
    Retrieves multiple catalog items by their IDs in a single query.
    Returns a dict mapping item ID (string) to CatalogItemOut.
    """
    with Span("db_batch_catalog"):
        items = db.query(CatalogItem).filter(CatalogItem.id.in_(data.ids)).all()
        result = {str(item.id): rs.CatalogItemOut.model_validate(item) for item in items}
        return rs.BatchCatalogResponse(items=result)
