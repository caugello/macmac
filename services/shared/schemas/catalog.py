from datetime import date, datetime

from pydantic import UUID4, BaseModel, ConfigDict

from services.shared.schemas.generic import UnitEnum


class CatalogItemCreate(BaseModel):
    """
    Model for creating a new catalog item.
    """

    vendor_name: str
    raw_name: str
    product_url: str
    canonical_name: str | None = None
    normalized_name: str | None = None
    brand: str | None = None
    net_quantity_value: float | None = None
    net_quantity_unit: UnitEnum | None = None
    is_food: bool

    # Enhanced fields from LLM extraction
    price: float | None = None
    currency: str | None = "EUR"
    category: str | None = None
    nutrition: dict | None = None  # Nutritional values per 100g
    nutriscore: str | None = None
    nutriscore_svg: str | None = None
    promotion_until_date: date | None = None
    image_url: str | None = None


class CatalogItemOut(CatalogItemCreate):
    """
    Model for outputting a catalog item.
    """

    id: UUID4
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CatalogItemListResponse(BaseModel):
    """
    Model for listing catalog items.
    """

    total: int
    limit: int | None = None
    offset: int | None = None
    data: list[CatalogItemOut]


class CatalogCategoriesResponse(BaseModel):
    """Response for listing distinct catalog categories."""

    categories: list[str]


class BatchCatalogRequest(BaseModel):
    """Request for batch fetching catalog items by IDs."""

    ids: list[UUID4]


class BatchCatalogResponse(BaseModel):
    """Response for batch fetching catalog items."""

    items: dict[str, CatalogItemOut]
