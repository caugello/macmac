"""add image_url column and category index

Revision ID: 0c753e295016
Revises: 32ab7df25635
Create Date: 2026-05-17

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0c753e295016"
down_revision: str | Sequence[str] | None = "32ab7df25635"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("catalog", sa.Column("image_url", sa.String(), nullable=True))
    op.create_index("ix_catalog_category", "catalog", ["category"])


def downgrade() -> None:
    op.drop_index("ix_catalog_category", table_name="catalog")
    op.drop_column("catalog", "image_url")
