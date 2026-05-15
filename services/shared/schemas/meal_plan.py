from datetime import date as DateType
from datetime import datetime
from enum import Enum

from pydantic import UUID4, BaseModel, Field


class MealTypeEnum(str, Enum):
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


class MealPlanUpdate(BaseModel):
    """Update an existing meal plan (change recipe or date/meal_type)"""

    date: DateType | None = None
    meal_type: MealTypeEnum | None = None
    recipe_id: UUID4 | None = None


# ===== OUTPUT =====


class MealPlanOut(BaseModel):
    """Single meal plan response"""

    id: UUID4
    date: DateType
    meal_type: MealTypeEnum
    recipe_id: UUID4
    recipe_title: str | None = Field(None, description="Denormalized from recipes service")
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


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
    category: str | None = None


class ShoppingListResponse(BaseModel):
    """Shopping list grouped by category"""

    date_range: dict[str, DateType] = Field(..., description="{start_date, end_date}")
    items_by_category: dict[str, list[ShoppingListItem]]
    total_items: int
    estimated_total: float | None = Field(None, description="Sum of all prices if available")
