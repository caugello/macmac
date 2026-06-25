import logging

from fastapi import HTTPException
from pydantic import UUID4
from sqlalchemy.orm import Session

from services.config import get_config
from services.framework.logging import Span
from services.framework.tracing import traced
from services.framework.user_context import require_user_context
from services.shared.lib.authorization import apply_ownership_filter, check_owner_only
from services.shared.lib.cache import initialize_service_cache
from services.shared.schemas import my_list as ml
from services.shared.schemas.generic import DeleteResponse

from .models import MyListItem

logger = logging.getLogger(__name__)

config = get_config()

cache = initialize_service_cache("meal_plans")


def _to_out(item: MyListItem) -> ml.MyListItemOut:
    return ml.MyListItemOut.model_validate(item)


def _invalidate(user_id: UUID4) -> None:
    cache.delete(f"my_list:u={user_id}")


@traced
async def list_my_list(db: Session, **kwargs) -> ml.MyListResponse:
    """Return the current user's saved products (cache-aside per user)."""
    user_ctx = require_user_context()

    cache_key = f"my_list:u={user_ctx.user_id}"
    cached = cache.get_json(cache_key)
    if cached:
        return ml.MyListResponse(**cached)

    with Span("db_list_my_list"):
        query = apply_ownership_filter(db.query(MyListItem), MyListItem)
        items = query.order_by(MyListItem.created_at).all()

        result = ml.MyListResponse(total=len(items), data=[_to_out(i) for i in items])
        cache.set_json(cache_key, result, ttl=config.cache.ttl.my_list)
        return result


@traced
async def add_my_list_item(data: ml.MyListItemCreate, db: Session) -> ml.MyListItemOut:
    """Add a product to the user's list. Idempotent: re-adding returns the existing row."""
    user_ctx = require_user_context()

    with Span("db_add_my_list_item"):
        existing = (
            db.query(MyListItem)
            .filter(
                MyListItem.user_id == user_ctx.user_id,
                MyListItem.catalog_item_id == data.catalog_item_id,
            )
            .first()
        )
        if existing:
            return _to_out(existing)

        item = MyListItem(
            catalog_item_id=data.catalog_item_id,
            name=data.name,
            brand=data.brand,
            price=data.price,
            image_url=data.image_url,
            nutriscore=data.nutriscore,
            user_id=user_ctx.user_id,
            group_id=None,
        )
        db.add(item)
        db.commit()
        db.refresh(item)

        _invalidate(user_ctx.user_id)
        return _to_out(item)


@traced
async def remove_my_list_item(catalog_item_id: UUID4, db: Session) -> DeleteResponse:
    """Remove a product from the user's list. Only the owner can remove."""
    user_ctx = require_user_context()

    with Span("db_remove_my_list_item"):
        item = (
            db.query(MyListItem)
            .filter(
                MyListItem.user_id == user_ctx.user_id,
                MyListItem.catalog_item_id == catalog_item_id,
            )
            .first()
        )
        if not item:
            raise HTTPException(404, "Item not found in My List")

        # Defense in depth: enforce ownership before deleting.
        check_owner_only(item.user_id, "remove")

        db.delete(item)
        db.commit()

        _invalidate(user_ctx.user_id)
        return DeleteResponse(success=True)


@traced
async def clear_my_list(db: Session) -> DeleteResponse:
    """Remove all products from the current user's list."""
    user_ctx = require_user_context()

    with Span("db_clear_my_list"):
        db.query(MyListItem).filter(MyListItem.user_id == user_ctx.user_id).delete()
        db.commit()

        _invalidate(user_ctx.user_id)
        return DeleteResponse(success=True)


@traced
async def merge_my_list(data: ml.MyListMergeRequest, db: Session) -> ml.MyListResponse:
    """Merge locally-stored items into the server list (login sync).

    Existing items are kept; new catalog items are added. Returns the
    resulting full list.
    """
    user_ctx = require_user_context()

    with Span("db_merge_my_list"):
        existing_ids = {
            row.catalog_item_id
            for row in db.query(MyListItem.catalog_item_id)
            .filter(MyListItem.user_id == user_ctx.user_id)
            .all()
        }

        seen: set = set()
        for entry in data.items:
            if entry.catalog_item_id in existing_ids or entry.catalog_item_id in seen:
                continue
            seen.add(entry.catalog_item_id)
            db.add(
                MyListItem(
                    catalog_item_id=entry.catalog_item_id,
                    name=entry.name,
                    brand=entry.brand,
                    price=entry.price,
                    image_url=entry.image_url,
                    nutriscore=entry.nutriscore,
                    user_id=user_ctx.user_id,
                    group_id=None,
                )
            )

        db.commit()
        _invalidate(user_ctx.user_id)

        return await list_my_list(db)
