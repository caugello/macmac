"""add recipe_favorites table

Revision ID: e7f8a9b0c1d2
Revises: c3d4e5f6a7b8
Create Date: 2026-06-30 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = "e7f8a9b0c1d2"
down_revision: str | Sequence[str] | None = "c3d4e5f6a7b8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "recipe_favorites",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("recipe_id", UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["recipe_id"], ["recipes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "recipe_id", name="uq_recipe_favorite_user_recipe"),
    )
    op.create_index("ix_recipe_favorite_user_id", "recipe_favorites", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_recipe_favorite_user_id", table_name="recipe_favorites")
    op.drop_table("recipe_favorites")
