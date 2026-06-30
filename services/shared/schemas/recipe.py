from datetime import datetime
from enum import StrEnum

from pydantic import UUID4, BaseModel, ConfigDict, Field, field_validator

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


class RecipeDifficultyEnum(StrEnum):
    """Recipe difficulty levels - matches database enum"""

    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


def _validate_image_url(v: str | None) -> str | None:
    if v is None:
        return v
    from urllib.parse import urlparse

    parsed = urlparse(v)
    if parsed.scheme and parsed.scheme not in ("http", "https"):
        raise ValueError("URL must use http or https scheme")
    return v


class RecipeCreate(BaseModel):
    """
    Model for creating a new recipe.
    """

    title: str = Field(..., min_length=2, max_length=200)
    description: str | None = None
    servings: int | None = Field(None, ge=1, le=100)
    prep_time: int | None = Field(None, ge=0, le=10080)
    calories: int | None = Field(None, ge=0, le=100000)
    difficulty: RecipeDifficultyEnum | None = None
    image_url: str | None = Field(None, max_length=2048)
    category: RecipeCategoryEnum | None = None
    ingredients: list[IngredientCreate]
    steps: list[str] | None = None

    _validate_image_url = field_validator("image_url")(_validate_image_url)


class RecipeUpdate(BaseModel):
    """
    Model for updating an existing recipe.

    PATCH semantics: an omitted ``category`` leaves the existing value unchanged,
    while an explicit ``"category": null`` clears it to uncategorized. The update
    handler distinguishes these cases via ``model_fields_set``. ``difficulty`` and
    ``image_url`` follow the same explicit-null convention.
    """

    title: str | None = None
    description: str | None = None
    servings: int | None = Field(None, ge=1, le=100)
    prep_time: int | None = Field(None, ge=0, le=10080)
    calories: int | None = Field(None, ge=0, le=100000)
    difficulty: RecipeDifficultyEnum | None = None
    image_url: str | None = Field(None, max_length=2048)
    category: RecipeCategoryEnum | None = None
    ingredients: list[IngredientCreate] | None = None
    steps: list[str] | None = None

    _validate_image_url = field_validator("image_url")(_validate_image_url)


class RecipeOut(BaseModel):
    """
    Model for outputting a recipe.
    """

    id: UUID4
    title: str
    normalized_title: str
    description: str | None
    servings: int | None = None
    prep_time: int | None = None
    calories: int | None = None
    difficulty: RecipeDifficultyEnum | None = None
    image_url: str | None = None
    category: RecipeCategoryEnum | None = None
    ingredients: list[Ingredient]
    steps: list[str] | None
    is_favorite: bool = False
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


class RecipeCategoryCountsResponse(BaseModel):
    """
    Maps each recipe category to the number of recipes the user has in it.

    Categories with zero recipes are omitted.
    """

    counts: dict[str, int]


class FavoriteResponse(BaseModel):
    """Result of marking/unmarking a recipe as a favorite."""

    recipe_id: UUID4
    is_favorite: bool


class BatchRecipeRequest(BaseModel):
    ids: list[UUID4]


class BatchRecipeResponse(BaseModel):
    items: dict[str, RecipeOut]
