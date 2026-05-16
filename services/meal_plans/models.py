import enum

from sqlalchemy import Column, Date, Index, UniqueConstraint
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID

from services.meal_plans.db import Base
from services.shared.models import BaseModel, UserOwnershipMixin


class MealTypeEnum(str, enum.Enum):
    """Meal types - matches frontend expectations"""

    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"


class MealPlan(BaseModel, UserOwnershipMixin, Base):
    """
    Single meal slot assignment (one recipe to one date+meal_type).
    Represents one of 21 weekly meal slots (7 days × 3 meals).
    """

    __tablename__ = "meal_plans"

    # Date (not DateTime - no time component needed)
    date = Column(Date, nullable=False, index=True)

    # Meal slot type
    meal_type = Column(
        SQLEnum(MealTypeEnum, values_callable=lambda x: [e.value for e in x]), nullable=False
    )

    # Recipe reference (validated against recipes service via httpx)
    recipe_id = Column(UUID(as_uuid=True), nullable=False)

    # Indexes & Constraints
    __table_args__ = (
        # Composite index for efficient week range queries
        Index("ix_meal_plans_date_meal_type", "date", "meal_type"),
        # Prevent double-booking a meal slot
        UniqueConstraint("date", "meal_type", "user_id", name="uq_date_meal_type_user"),
        # Index on recipe_id for "where is this recipe used?" queries
        Index("ix_meal_plans_recipe_id", "recipe_id"),
        # User and group ownership indexes
        Index("ix_meal_plan_user_id", "user_id"),
        Index("ix_meal_plan_group_id", "group_id"),
        # Composite index for efficient user+group queries
        Index("ix_meal_plan_user_group", "user_id", "group_id"),
    )
