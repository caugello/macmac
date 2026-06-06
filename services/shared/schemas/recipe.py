from datetime import datetime
from enum import StrEnum

from pydantic import UUID4, BaseModel, ConfigDict, Field

from .ingredient import Ingredient, IngredientCreate


class RecipeCategoryEnum(StrEnum):
    """Recipe categories - matches database enum"""

    BREAKFAST = "breakfast"
    MAIN = "main"
    DESSERT = "dessert"
    SNACK = "snack"
    APPETIZER = "appetizer"
    BEVERAGE = "beverage"
    OTHER = "other"


class RecipeCreate(BaseModel):
    """
    Model for creating a new recipe.
    """

    title: str = Field(..., min_length=2, max_length=200)
    description: str | None = None
    servings: int | None = Field(None, ge=1, le=100)
    category: RecipeCategoryEnum | None = None
    ingredients: list[IngredientCreate]
    steps: list[str] | None = None


class RecipeUpdate(BaseModel):
    """
    Model for updating an existing recipe.

    PATCH semantics: an omitted ``category`` leaves the existing value unchanged,
    while an explicit ``"category": null`` clears it to uncategorized. The update
    handler distinguishes these cases via ``model_fields_set``.
    """

    title: str | None = None
    description: str | None = None
    servings: int | None = Field(None, ge=1, le=100)
    category: RecipeCategoryEnum | None = None
    ingredients: list[IngredientCreate] | None = None
    steps: list[str] | None = None


class RecipeOut(BaseModel):
    """
    Model for outputting a recipe.
    """

    id: UUID4
    title: str
    normalized_title: str
    description: str | None
    servings: int | None = None
    category: RecipeCategoryEnum | None = None
    ingredients: list[Ingredient]
    steps: list[str] | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RecipeListResponse(BaseModel):
    """
    Model for listing recipes.
    """

    total: int
    limit: int | None = None
    offset: int | None = None
    data: list[RecipeOut]


class RecipeQueryParams(BaseModel):
    """
    Model for querying recipes.
    """

    limit: int = Field(20, ge=1, le=100)
    offset: int = Field(0, ge=0)
    search: str | None = None
    ingredient: str | None = None
    sort: str | None = Field(None, json_schema_extra={"examples": ["title:asc"]})


class BatchRecipeRequest(BaseModel):
    ids: list[UUID4]


class BatchRecipeResponse(BaseModel):
    items: dict[str, RecipeOut]
