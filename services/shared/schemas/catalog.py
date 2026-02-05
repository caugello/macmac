from datetime import datetime
from typing import List, Optional

from pydantic import UUID4, BaseModel

from services.shared.schemas.generic import UnitEnum


class CatalogItemCreate(BaseModel):
    """
    Model for creating a new catalog item.
    """

    vendor_name: str
    raw_name: str
    product_url: str
    canonical_name: Optional[str] = None
    normalized_name: Optional[str] = None
    brand: Optional[str] = None
    net_quantity_value: Optional[float] = None
    net_quantity_unit: Optional[UnitEnum] = None
    is_food: bool


class CatalogItemOut(CatalogItemCreate):
    """
    Model for outputting a catalog item.
    """

    id: UUID4
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CatalogItemListResponse(BaseModel):
    """
    Model for listing catalog items.
    """

    total: int
    limit: Optional[int] = None
    offset: Optional[int] = None
    data: List[CatalogItemOut]
