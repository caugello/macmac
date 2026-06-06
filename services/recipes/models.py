from sqlalchemy import JSON, Column, DateTime, Float, ForeignKey, Index, Integer, String, func
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from services.recipes.db import Base
from services.shared.models import BaseModel, UserOwnershipMixin, UUIDPrimaryKeyMixin
from services.shared.schemas.recipe import RecipeCategoryEnum


class Recipe(BaseModel, UserOwnershipMixin, Base):
    """
    A recipe for a dish.
    """

    __tablename__ = "recipes"

    # original user-facing title
    title = Column(String, nullable=False)

    # normalized title for uniqueness/indexing
    normalized_title = Column(String, nullable=False)

    description = Column(String)
    servings = Column(Integer, nullable=True)
    category = Column(
        SQLEnum(RecipeCategoryEnum, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    steps = Column(JSON)

    # Relationship to ingredients
    recipe_ingredients = relationship(
        "RecipeIngredient", back_populates="recipe", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_recipe_normalized_title", "normalized_title", unique=True),
        Index("ix_recipe_user_id", "user_id"),
        Index("ix_recipe_group_id", "group_id"),
        # Composite index for efficient user+group queries
        Index("ix_recipe_user_group", "user_id", "group_id"),
        Index("idx_recipes_category", "category"),
    )


class RecipeIngredient(UUIDPrimaryKeyMixin, Base):
    """
    Join table linking recipes to catalog items with quantities.
    """

    __tablename__ = "recipe_ingredients"

    recipe_id = Column(
        UUID(as_uuid=True), ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False
    )
    catalog_item_id = Column(
        UUID(as_uuid=True), nullable=False
    )  # FK to catalog.catalog_items (different DB)
    qty = Column(Float, nullable=False)
    unit = Column(String, nullable=False)  # UnitEnum value

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationship back to recipe
    recipe = relationship("Recipe", back_populates="recipe_ingredients")

    __table_args__ = (
        Index("ix_recipe_ingredient_recipe_id", "recipe_id"),
        Index("ix_recipe_ingredient_catalog_item_id", "catalog_item_id"),
    )
