"""initial tables

Revision ID: 001_initial
Revises:
Create Date: 2026-05-14 00:00:00.000000
"""

from collections.abc import Sequence
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID, ENUM

revision: str = "001_initial"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Create the enum type object
meal_type_enum = ENUM("breakfast", "lunch", "dinner", name="mealtypeenum", create_type=False)


def upgrade() -> None:
    # Create enum type
    meal_type_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "meal_plans",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("meal_type", meal_type_enum, nullable=False),
        sa.Column("recipe_id", UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("date", "meal_type", name="uq_date_meal_type"),
    )

    op.create_index("ix_meal_plans_date_meal_type", "meal_plans", ["date", "meal_type"])
    op.create_index("ix_meal_plans_recipe_id", "meal_plans", ["recipe_id"])


def downgrade() -> None:
    op.drop_index("ix_meal_plans_recipe_id", table_name="meal_plans")
    op.drop_index("ix_meal_plans_date_meal_type", table_name="meal_plans")
    op.drop_table("meal_plans")
    meal_type_enum.drop(op.get_bind(), checkfirst=True)
