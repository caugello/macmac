from datetime import date as DateType
from datetime import datetime
from enum import StrEnum

from pydantic import UUID4, BaseModel, ConfigDict, Field


class MealTypeEnum(StrEnum):
    """Matches database enum"""

    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"


# ===== CREATE / UPDATE =====


class MealPlanCreate(BaseModel):
    """Request to assign a recipe to a date+meal_type slot"""

    date: DateType = Field(..., description="Date for the meal (YYYY-MM-DD)")
    meal_type: MealTypeEnum = Field(..., description="breakfast, lunch, or dinner")
    recipe_id: UUID4 = Field(..., description="UUID of recipe to schedule")
    notes: str | None = Field(None, max_length=1000)


class MealPlanUpdate(BaseModel):
    """Update an existing meal plan (change recipe or date/meal_type)"""

    date: DateType | None = None
    meal_type: MealTypeEnum | None = None
    recipe_id: UUID4 | None = None
    notes: str | None = Field(None, max_length=1000)


# ===== OUTPUT =====


class MealPlanOut(BaseModel):
    """Single meal plan response"""

    id: UUID4
    date: DateType
    meal_type: MealTypeEnum
    recipe_id: UUID4
    recipe_title: str | None = Field(None, description="Denormalized from recipes service")
    notes: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MealPlanListResponse(BaseModel):
    """List response with metadata"""

    total: int
    data: list[MealPlanOut]


# ===== COPY OPERATIONS =====


class CopyDayRequest(BaseModel):
    """Copy all 3 meals from one date to another"""

    source_date: DateType = Field(..., description="Date to copy from")
    target_date: DateType = Field(..., description="Date to copy to (will overwrite)")


class CopyWeekRequest(BaseModel):
    """Copy 21 meals from one week to another (Monday-to-Monday)"""

    source_week_start: DateType = Field(..., description="Monday of source week")
    target_week_start: DateType = Field(..., description="Monday of target week")


class CopyResponse(BaseModel):
    """Response after copy operation"""

    copied_count: int
    message: str


# ===== SHOPPING LIST =====


class ShoppingListRequest(BaseModel):
    """Generate shopping list for date range"""

    start_date: DateType
    end_date: DateType


class ShoppingListItem(BaseModel):
    """Aggregated ingredient for shopping"""

    catalog_item_id: UUID4
    catalog_item_name: str
    total_qty: float = Field(..., description="Sum of all quantities (converted to base unit)")
    unit: str
    price: float | None = None
    line_total: float | None = None
    category: str | None = None
    is_on_promotion: bool = False
    promotion_until_date: DateType | None = None
    package_size: float | None = Field(None, description="Size of one package (e.g., 150)")
    package_unit: str | None = Field(None, description="Unit of the package (e.g., g)")
    packages_needed: int | None = Field(
        None, description="Whole packages to buy: ceil(total_qty / package_size)"
    )
    last_enriched_at: datetime | None = None
    is_unavailable: bool = Field(
        False,
        description="True when the catalog item is missing/deleted; excluded from the total",
    )


class ShoppingListResponse(BaseModel):
    """Shopping list grouped by category"""

    date_range: dict[str, DateType] = Field(..., description="{start_date, end_date}")
    items_by_category: dict[str, list[ShoppingListItem]]
    # Top-level (not in items_by_category, which is keyed by real catalog
    # categories): the user's persisted My List products, surfaced as manual
    # "Extras" alongside the recipe-derived ingredients. Deduplicated against
    # the recipe ingredients by catalog_item_id.
    extras: list[ShoppingListItem] = Field(
        default_factory=list,
        description="User's My List items, deduped against recipe ingredients by catalog_item_id",
    )
    total_items: int
    estimated_total: float | None = Field(None, description="Sum of all prices if available")
