from datetime import date, datetime

from pydantic import UUID4, BaseModel, ConfigDict, Field, field_validator

from services.shared.schemas.generic import UnitEnum


class NutritionInfo(BaseModel):
    """Typed schema for nutritional values per 100g."""

    energy_kcal: float | None = Field(None, ge=0, le=10000)
    protein_g: float | None = Field(None, ge=0, le=1000)
    carbs_g: float | None = Field(None, ge=0, le=1000)
    sugars_g: float | None = Field(None, ge=0, le=1000)
    fat_g: float | None = Field(None, ge=0, le=1000)
    saturated_fat_g: float | None = Field(None, ge=0, le=1000)
    fiber_g: float | None = Field(None, ge=0, le=1000)
    salt_g: float | None = Field(None, ge=0, le=100)
    serving_size: str | None = Field(None, max_length=50)

    model_config = ConfigDict(extra="allow")


class CatalogItemCreate(BaseModel):
    """
    Model for creating a new catalog item.
    """

    vendor_name: str = Field(..., max_length=100)
    raw_name: str = Field(..., max_length=500)
    product_url: str = Field(..., max_length=2048)
    canonical_name: str | None = Field(None, max_length=300)
    normalized_name: str | None = Field(None, max_length=300)
    brand: str | None = Field(None, max_length=100)
    net_quantity_value: float | None = None
    net_quantity_unit: UnitEnum | None = None
    is_food: bool

    # Enhanced fields from LLM extraction
    price: float | None = None
    currency: str | None = Field("EUR", max_length=3)
    category: str | None = Field(None, max_length=100)
    nutrition: dict | None = None
    nutriscore: str | None = Field(None, max_length=1)
    nutriscore_svg: str | None = Field(None, max_length=2000)
    promotion_until_date: date | None = None
    image_url: str | None = Field(None, max_length=2048)
    last_enriched_at: datetime | None = None

    @field_validator("nutrition", mode="before")
    @classmethod
    def coerce_nutrition_to_dict(cls, v):
        if v is None:
            return v
        if isinstance(v, BaseModel):
            return v.model_dump(exclude_none=True)
        if isinstance(v, dict):
            NutritionInfo(**v)
            return v
        return v

    @field_validator("nutriscore_svg", mode="before")
    @classmethod
    def sanitize_svg(cls, v: str | None) -> str | None:
        from services.shared.lib.svg_sanitizer import sanitize_nutriscore_svg

        return sanitize_nutriscore_svg(v)

    @field_validator("product_url", "image_url")
    @classmethod
    def validate_url_scheme(cls, v: str | None) -> str | None:
        if v is None:
            return v
        from urllib.parse import urlparse

        parsed = urlparse(v)
        if parsed.scheme and parsed.scheme not in ("http", "https"):
            raise ValueError("URL must use http or https scheme")
        return v


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
