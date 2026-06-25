"""add prep_time, calories, difficulty and image_url to recipes

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-24 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import ENUM

# revision identifiers, used by Alembic.
revision: str = "c3d4e5f6a7b8"
down_revision: str | Sequence[str] | None = "b2c3d4e5f6a7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# PostgreSQL native ENUM type. Name matches SQLAlchemy's auto-derived name for
# SQLEnum(RecipeDifficultyEnum) so the model and migration stay in sync.
recipe_difficulty_enum = ENUM(
    "easy",
    "medium",
    "hard",
    name="recipedifficultyenum",
    create_type=False,
)


def upgrade() -> None:
    # Create the enum type (no-op if it already exists)
    recipe_difficulty_enum.create(op.get_bind(), checkfirst=True)

    # All columns nullable; existing rows default to NULL
    op.add_column("recipes", sa.Column("prep_time", sa.Integer(), nullable=True))
    op.add_column("recipes", sa.Column("calories", sa.Integer(), nullable=True))
    op.add_column("recipes", sa.Column("difficulty", recipe_difficulty_enum, nullable=True))
    op.add_column("recipes", sa.Column("image_url", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("recipes", "image_url")
    op.drop_column("recipes", "difficulty")
    op.drop_column("recipes", "calories")
    op.drop_column("recipes", "prep_time")
    recipe_difficulty_enum.drop(op.get_bind(), checkfirst=True)
