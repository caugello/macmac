from datetime import date, datetime

from pydantic import UUID4, BaseModel, ConfigDict, Field, field_validator, model_validator

from services.shared.schemas.generic import UnitEnum


def compute_unit_price(
    price: float | None,
    net_quantity_value: float | None,
    net_quantity_unit: UnitEnum | None,
) -> tuple[float | None, str | None]:
    """Derive a normalized unit price and its reference unit.

    Grams are reported per kilogram and millilitres per litre so the value is
    comparable; every other unit is reported per the item's own unit. Returns
    ``(None, None)`` when the inputs can't yield a meaningful unit price.
    """
    if price is None or net_quantity_value is None or net_quantity_value <= 0:
        return None, None

    reference: str | None
    if net_quantity_unit == UnitEnum.GRAM:
        ratio = price / net_quantity_value * 1000
        reference = UnitEnum.KILOGRAM.value
    elif net_quantity_unit == UnitEnum.MILLILITER:
        ratio = price / net_quantity_value * 1000
        reference = UnitEnum.LITER.value
    else:
        ratio = price / net_quantity_value
        reference = net_quantity_unit.value if net_quantity_unit is not None else None

    return round(ratio, 2), reference


def unit_price_conflicts(
    price: float | None,
    net_quantity_value: float | None,
    net_quantity_unit: UnitEnum | None,
    unit_price: float | None,
    unit_price_unit: str | None,
) -> bool:
    """Whether ``price / quantity`` grossly contradicts a scraped ``unit_price``.

    Variable-weight goods list a €/kg figure that the LLM can mistake for the
    pack price, pairing it with an invented weight. When the derived unit price
    diverges from the scraped ground truth by more than 2x (in the same
    reference unit), the pack price/quantity are untrustworthy. Returns ``False``
    when there isn't enough comparable data to judge.
    """
    if unit_price is None or unit_price <= 0:
        return False
    derived, derived_unit = compute_unit_price(price, net_quantity_value, net_quantity_unit)
    if derived is None or derived_unit != unit_price_unit:
        return False
    ratio = derived / unit_price
    return ratio < 0.5 or ratio > 2.0


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
    vendor_product_id: str = Field(..., max_length=500)
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
    unit_price: float | None = None
    unit_price_unit: str | None = Field(None, max_length=10)
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

    @model_validator(mode="after")
    def derive_unit_price(self):
        """Fill ``unit_price`` from ``price``/``net_quantity`` when not supplied.

        A scraped ground-truth ``unit_price`` (variable-weight goods) always
        wins; otherwise the value is derived so fixed packs and pre-existing rows
        (NULL column) still expose a unit price on read.
        """
        if self.unit_price is None:
            self.unit_price, self.unit_price_unit = compute_unit_price(
                self.price, self.net_quantity_value, self.net_quantity_unit
            )
        return self


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


class CatalogDepartmentCategory(BaseModel):
    """A leaf category within a department, with its live item count."""

    name: str
    count: int


class CatalogDepartment(BaseModel):
    """A catalog department with its Material Symbols icon and categories.

    ``count`` is the sum of the category counts. The full taxonomy is always
    returned (categories with no items report ``count=0``) so the department
    rail stays stable regardless of how the catalog is populated.
    """

    name: str
    icon: str
    count: int
    categories: list[CatalogDepartmentCategory]


class CatalogDepartmentsResponse(BaseModel):
    """The full 2-level taxonomy with live per-category counts.

    Always lists all 8 departments / 36 categories in taxonomy order.
    """

    departments: list[CatalogDepartment]


class CatalogStatsResponse(BaseModel):
    """Enrichment-coverage counts for the catalog.

    Coverage the queues can't show: how much of the catalog is actually
    enriched. ``fresh`` mirrors the snitch freshness definition (enriched
    within the configured window AND has the fields that make an item complete);
    ``stale`` is everything else. The ``missing_*`` counts map onto the
    re-enqueue backfill priorities.
    """

    total: int
    fresh: int
    stale: int
    missing_image_url: int
    missing_nutrition: int
    missing_nutriscore: int


class BatchCatalogRequest(BaseModel):
    """Request for batch fetching catalog items by IDs."""

    ids: list[UUID4]


class BatchCatalogResponse(BaseModel):
    """Response for batch fetching catalog items."""

    items: dict[str, CatalogItemOut]
