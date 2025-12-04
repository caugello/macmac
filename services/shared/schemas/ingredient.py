from enum import Enum

from pydantic import BaseModel, Field


class UnitEnum(str, Enum):
    """
    Units of measurement for ingredients
    """

    GRAM = "g"
    KILOGRAM = "kg"
    MILLILITER = "ml"
    LITER = "l"
    TEASPOON = "tsp"
    TABLESPOON = "tbsp"
    PIECE = "pc"
    PINCH = "pinch"
    DASH = "dash"


class Ingredient(BaseModel):
    """
    Ingredient schema for the API
    """

    name: str = Field(
        ...,
        description="Name of the ingredient",
        example="chicken breast",
        min_length=2,
        max_length=200,
    )
    qty: float = Field(
        ...,
        gt=0,
        description="Quantity of the ingredient",
        example=500,
    )
    unit: UnitEnum = Field(
        ...,
        description="Unit of measurement",
        example=UnitEnum.GRAM,
    )

    model_config = {
        "from_attributes": True,
    }
