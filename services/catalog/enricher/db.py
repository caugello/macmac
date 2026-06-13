import logging
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from services.catalog.models import CatalogItem
from services.shared.schemas import catalog as rs

logger = logging.getLogger(__name__)

MUTABLE_FIELDS = [
    "raw_name",
    "canonical_name",
    "normalized_name",
    "brand",
    "net_quantity_value",
    "net_quantity_unit",
    "product_url",
    "price",
    "currency",
    "category",
    "nutrition",
    "nutriscore",
    "nutriscore_svg",
    "promotion_until_date",
    "image_url",
    "is_food",
    "last_enriched_at",
]


def create_catalog_item(data: rs.CatalogItemCreate, db: Session):
    existing = (
        db.query(CatalogItem)
        .filter(
            CatalogItem.vendor_name == data.vendor_name,
            CatalogItem.vendor_product_id == data.vendor_product_id,
        )
        .first()
    )

    if existing:
        updated_fields = []
        for field in MUTABLE_FIELDS:
            new_value = getattr(data, field)
            if new_value is not None:
                old_value = getattr(existing, field)
                if new_value != old_value:
                    setattr(existing, field, new_value)
                    updated_fields.append(field)

        # Always stamp enrichment time
        existing.last_enriched_at = datetime.now(UTC)

        if updated_fields:
            db.commit()
            db.refresh(existing)
            logger.info(f"Updated {data.product_url}: {', '.join(updated_fields)}")
        else:
            db.commit()
            db.refresh(existing)
            logger.debug(f"No changes for {data.product_url}")

        return rs.CatalogItemOut.model_validate(existing)

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
        currency=data.currency,
        category=data.category,
        nutrition=data.nutrition,
        nutriscore=data.nutriscore,
        nutriscore_svg=data.nutriscore_svg,
        promotion_until_date=data.promotion_until_date,
        image_url=data.image_url,
        last_enriched_at=datetime.now(UTC),
    )

    db.add(item)
    db.commit()
    db.refresh(item)
    return rs.CatalogItemOut.model_validate(item)
