import uuid

from sqlalchemy import JSON, Boolean, Column, DateTime, Float, Index, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class CatalogItem(Base):
    """
    A catalog item
    """

    __tablename__ = "catalog"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

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
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    __table_args__ = (
        Index("ix_catalog_normalized_name", "normalized_name"),
        Index("ix_catalog_product_url", "product_url", unique=True),
    )
