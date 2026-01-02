from fastapi import HTTPException
from pydantic import UUID4
from sqlalchemy import asc, desc
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from services.framework.logging import Span
from services.framework.tracing import traced
from services.shared.schemas import catalog as rs

from .models import CatalogItem


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
        )

        db.add(item)
        try:
            db.commit()
            db.refresh(item)
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail=f"CatalogItem '{data.product_url}' already exists. {exc.detail}",
            )

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
    """
    with Span("db_list_catalog_items"):
        query = db.query(CatalogItem)

        # ---- TEXT SEARCH (case-insensitive)
        if search:
            s = f"%{search.lower()}%"
            query = query.filter(CatalogItem.normalized_name.ilike(s))

        # ---- SORTING
        if sort:
            try:
                field, direction = sort.split(":")
                direction = direction.lower()
                field_obj = getattr(CatalogItem, field)
                if direction == "asc":
                    query = query.order_by(asc(field_obj))
                elif direction == "desc":
                    query = query.order_by(desc(field_obj))
                else:
                    raise ValueError()
            except Exception:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid sort value. Use field:asc or field:desc",
                )

        # ---- TOTAL COUNT (before applying limit/offset)
        total = query.count()

        # ---- PAGINATION
        items = query.offset(offset).limit(limit).all()

        # Return with metadata
        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "data": [rs.CatalogItemOut.model_validate(r) for r in items],
        }


@traced
async def get_catalog_item(item_id: UUID4, db: Session) -> rs.CatalogItemOut:
    """
    Retrieves a single item by its ID.
    """
    with Span("db_query_catalog"):
        recipe = db.query(CatalogItem).filter(CatalogItem.id == item_id).first()
        if not recipe:
            raise HTTPException(404, "CatalogItem not found")
        return rs.CatalogItemOut.model_validate(recipe)
