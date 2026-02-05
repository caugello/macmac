from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from services.catalog.models import CatalogItem
from services.shared.schemas import catalog as rs


def create_catalog_item(data: rs.CatalogItemCreate, db: Session):
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
    )

    db.add(item)
    try:
        db.commit()
        db.refresh(item)
    except IntegrityError as exc:
        db.rollback()
        raise ValueError(
            f"CatalogItem '{data.product_url}' already exists. {exc.detail}"
        )

    return rs.CatalogItemOut.model_validate(item)
