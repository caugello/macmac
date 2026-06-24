from datetime import datetime

from pydantic import UUID4, BaseModel, ConfigDict, Field

# ===== CREATE =====


class MyListItemCreate(BaseModel):
    """Add a catalog product to the user's personal list.

    Display fields are denormalized so the list can be rendered without
    fanning out to the catalog service on every read.
    """

    catalog_item_id: UUID4 = Field(..., description="UUID of the catalog item to save")
    name: str = Field(..., max_length=500)
    brand: str | None = Field(None, max_length=500)
    price: float | None = None
    image_url: str | None = Field(None, max_length=2000)
    nutriscore: str | None = Field(None, max_length=8)


class MyListMergeRequest(BaseModel):
    """Merge a batch of locally-stored items into the server list (login sync)."""

    items: list[MyListItemCreate] = Field(default_factory=list)


# ===== OUTPUT =====


class MyListItemOut(BaseModel):
    """Single saved product."""

    id: UUID4
    catalog_item_id: UUID4
    name: str
    brand: str | None = None
    price: float | None = None
    image_url: str | None = None
    nutriscore: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MyListResponse(BaseModel):
    """The user's full list."""

    total: int
    data: list[MyListItemOut]
