"""add recipe category

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-06 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import ENUM

# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6a7"
down_revision: str | Sequence[str] | None = "a1b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# PostgreSQL native ENUM type. Name matches SQLAlchemy's auto-derived name for
# SQLEnum(RecipeCategoryEnum) so the model and migration stay in sync.
recipe_category_enum = ENUM(
    "breakfast",
    "main",
    "dessert",
    "snack",
    "appetizer",
    "beverage",
    "other",
    name="recipecategoryenum",
    create_type=False,
)


def upgrade() -> None:
    # Create the enum type (no-op if it already exists)
    recipe_category_enum.create(op.get_bind(), checkfirst=True)

    # Add nullable category column; existing rows default to NULL
    op.add_column("recipes", sa.Column("category", recipe_category_enum, nullable=True))

    op.create_index("idx_recipes_category", "recipes", ["category"])


def downgrade() -> None:
    op.drop_index("idx_recipes_category", table_name="recipes")
    op.drop_column("recipes", "category")
    recipe_category_enum.drop(op.get_bind(), checkfirst=True)
