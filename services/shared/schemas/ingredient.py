from pydantic import BaseModel, Field

from services.shared.schemas.generic import UnitEnum


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
