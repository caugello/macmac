from datetime import datetime
from typing import List, Optional

from pydantic import UUID4, BaseModel, Field

from .ingredient import Ingredient


class RecipeCreate(BaseModel):
    """
    Model for creating a new recipe.
    """

    title: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    ingredients: List[Ingredient]
    steps: Optional[List[str]] = None


class RecipeUpdate(BaseModel):
    """
    Model for updating an existing recipe.
    """

    title: Optional[str] = None
    description: Optional[str] = None
    ingredients: Optional[List[Ingredient]] = None
    steps: Optional[List[str]] = None


class RecipeOut(BaseModel):
    """
    Model for outputting a recipe.
    """

    id: UUID4
    title: str
    normalized_title: str
    description: Optional[str]
    ingredients: List[Ingredient]
    steps: Optional[List[str]]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RecipeListResponse(BaseModel):
    """
    Model for listing recipes.
    """

    total: int
    limit: Optional[int] = None
    offset: Optional[int] = None
    data: List[RecipeOut]


class RecipeQueryParams(BaseModel):
    """
    Model for querying recipes.
    """

    limit: int = Field(20, ge=1, le=100)
    offset: int = Field(0, ge=0)
    search: str | None = None
    ingredient: str | None = None
    sort: str | None = Field(None, example="title:asc")
