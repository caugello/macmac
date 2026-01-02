from enum import Enum

from pydantic import BaseModel


class DeleteResponse(BaseModel):
    """
    A generic response for delete operations
    """

    success: bool


class UnitEnum(str, Enum):
    """
    Units of measurement
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
