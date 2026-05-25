"""add notes to meal_plans

Revision ID: 003_add_notes
Revises: 002_add_user_group
Create Date: 2026-05-25 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "003_add_notes"
down_revision: str | None = "002_add_user_group"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("meal_plans", sa.Column("notes", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("meal_plans", "notes")
