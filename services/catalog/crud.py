from fastapi import HTTPException
from pydantic import UUID4
from sqlalchemy.orm import Session

from services.config import get_config
from services.framework.logging import Span
from services.framework.tracing import traced
from services.shared.lib.cache import initialize_service_cache
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
            raw_name=data.raw_name,
            normalized_name=data.normalized_name,
            canonical_name=data.canonical_name,
            brand=data.brand,
            net_quantity_value=data.net_quantity_value,
            net_quantity_unit=data.net_quantity_unit,
            product_url=data.product_url,
            is_food=data.is_food,
            # Enhanced fields from LLM extraction
            price=data.price,
            currency=data.currency,
            category=data.category,
            nutrition=data.nutrition,
        )

        with safe_commit(db, f"CatalogItem '{data.product_url}' already exists"):
            db.add(item)
        db.refresh(item)

        # Invalidate list caches
        cache.delete_pattern("catalog:list:*")

        return rs.CatalogItemOut.model_validate(item)


@traced
async def list_catalog_items(
    db: Session,
    limit: int = 20,
    offset: int = 0,
    search: str | None = None,
    sort: str | None = None,
):
    """
    Lists catalog items with optional filtering, searching, and sorting.
    Caches results for 5 minutes.
    """
    # Build cache key from query params
    cache_key = f"catalog:list:l={limit}:o={offset}:s={search or ''}:sort={sort or ''}"
    cached = cache.get_json(cache_key)
    if cached:
        return cached

    with Span("db_list_catalog_items"):
        query = db.query(CatalogItem)

        # ---- TEXT SEARCH (case-insensitive)
        if search:
            s = f"%{search.lower()}%"
            query = query.filter(CatalogItem.normalized_name.ilike(s))

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
