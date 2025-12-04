import uuid

from sqlalchemy import JSON, Column, DateTime, Index, String, func
from sqlalchemy.dialects.postgresql import UUID

from services.recipes.db import Base


class Recipe(Base):
    """
    A recipe for a dish.
    """

    __tablename__ = "recipes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # original user-facing title
    title = Column(String, nullable=False)

    # normalized title for uniqueness/indexing
    normalized_title = Column(String, nullable=False)

    description = Column(String)
    ingredients = Column(JSON, nullable=False)
    steps = Column(JSON)

    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_recipe_normalized_title", "normalized_title", unique=True),
    )
