from sqlalchemy import Boolean, Column, Date, DateTime, Float, Index, String, Text
from sqlalchemy.dialects.postgresql import JSON

from services.catalog.db import Base
from services.shared.models import BaseModel


class CatalogItem(BaseModel, Base):
    """
    A catalog item
    """

    __tablename__ = "catalog"

    # TODO: make this a relation to vendor table when more vendors are available
    vendor_name = Column(String, nullable=False)
    vendor_product_id = Column(String, nullable=False)
    raw_name = Column(String, nullable=False)
    normalized_name = Column(String)
    canonical_name = Column(String)
    brand = Column(String)
    net_quantity_value = Column(Float)
    net_quantity_unit = Column(String)
    product_url = Column(String, nullable=False)
    is_food = Column(Boolean, nullable=False)

    # Enhanced fields from LLM extraction
    price = Column(Float)
    # Ground-truth price per reference unit (e.g. 8.50 with unit "kg") scraped
    # from the vendor's per-unit price element. Authoritative for variable-weight
    # goods (meat/fish sold au poids) where there is no fixed pack price.
    unit_price = Column(Float)
    unit_price_unit = Column(String)
    currency = Column(String, default="EUR")
    category = Column(String)
    # none_as_null: persist a missing value as SQL NULL, not JSON 'null', so the
    # requeue backfill and stats counts (which test nutrition IS NULL) see it.
    nutrition = Column(JSON(none_as_null=True))  # Nutritional values per 100g
    nutriscore = Column(String)
    nutriscore_svg = Column(Text)
    promotion_until_date = Column(Date)
    image_url = Column(String)
    last_enriched_at = Column(DateTime(timezone=True), nullable=True)
    __table_args__ = (
        Index("ix_catalog_normalized_name", "normalized_name"),
        Index("ix_catalog_product_url", "product_url", unique=True),
        Index("ix_catalog_vendor_product_id", "vendor_name", "vendor_product_id", unique=True),
        Index("ix_catalog_category", "category"),
        Index("ix_catalog_is_food", "is_food"),
    )
