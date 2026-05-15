from pydantic import UUID4, BaseModel, Field

from services.shared.schemas.generic import UnitEnum


class IngredientCreate(BaseModel):
    """
    Ingredient input schema - references catalog item
    """

    catalog_item_id: UUID4 = Field(
        ...,
        description="ID of the catalog item to use as ingredient",
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


class IngredientOut(BaseModel):
    """
    Ingredient output schema - includes catalog item details
    """

    catalog_item_id: UUID4
    catalog_item_name: str = Field(
        ...,
        description="Name of the catalog item (for display)",
    )
    qty: float
    unit: UnitEnum

    model_config = {
        "from_attributes": True,
    }


# Backward compatibility alias
Ingredient = IngredientOut
