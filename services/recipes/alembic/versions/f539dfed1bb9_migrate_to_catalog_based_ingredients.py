"""migrate to catalog based ingredients

Revision ID: f539dfed1bb9
Revises: 3ba7e9dd2856
Create Date: 2026-05-14 16:59:18.456509

Migrates ingredients from free-text JSON to catalog-based references.
This is a breaking change - all existing recipes will be deleted.

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "f539dfed1bb9"
down_revision: Union[str, Sequence[str], None] = "3ba7e9dd2856"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - migrate to catalog-based ingredients."""

    # Step 1: Delete all existing recipes (clean slate as per user preference)
    op.execute("DELETE FROM recipes")

    # Step 2: Drop the old ingredients column
    op.drop_column("recipes", "ingredients")

    # Step 3: Create recipe_ingredients join table
    op.create_table(
        "recipe_ingredients",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("recipe_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("catalog_item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("qty", sa.Float(), nullable=False),
        sa.Column("unit", sa.String(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["recipe_id"], ["recipes.id"], ondelete="CASCADE"),
    )

    # Step 4: Create indexes
    op.create_index("ix_recipe_ingredient_recipe_id", "recipe_ingredients", ["recipe_id"])
    op.create_index(
        "ix_recipe_ingredient_catalog_item_id", "recipe_ingredients", ["catalog_item_id"]
    )


def downgrade() -> None:
    """Downgrade schema - restore old ingredients column."""

    # Drop recipe_ingredients table
    op.drop_index("ix_recipe_ingredient_catalog_item_id", table_name="recipe_ingredients")
    op.drop_index("ix_recipe_ingredient_recipe_id", table_name="recipe_ingredients")
    op.drop_table("recipe_ingredients")

    # Restore ingredients JSON column
    op.add_column(
        "recipes",
        sa.Column(
            "ingredients",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
    )
