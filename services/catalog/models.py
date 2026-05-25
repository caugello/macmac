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
    currency = Column(String, default="EUR")
    category = Column(String)
    nutrition = Column(JSON)  # Nutritional values per 100g
    nutriscore = Column(String)
    nutriscore_svg = Column(Text)
    promotion_until_date = Column(Date)
    image_url = Column(String)
    last_enriched_at = Column(DateTime(timezone=True), nullable=True)
    __table_args__ = (
        Index("ix_catalog_normalized_name", "normalized_name"),
        Index("ix_catalog_product_url", "product_url", unique=True),
        Index("ix_catalog_category", "category"),
        Index("ix_catalog_is_food", "is_food"),
    )
