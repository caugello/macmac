"""add servings to recipes

Revision ID: a1b2c3d4e5f6
Revises: f539dfed1bb9
Create Date: 2026-05-24 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: str | Sequence[str] | None = "8a2f3e4b5c6d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("recipes", sa.Column("servings", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("recipes", "servings")
