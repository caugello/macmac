"""add vendor_product_id column

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8
Create Date: 2026-06-13 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c4d5e6f7a8b9"
down_revision: str | Sequence[str] | None = "b3c4d5e6f7a8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Backfill from URL slug before adding NOT NULL
    op.add_column(
        "catalog",
        sa.Column("vendor_product_id", sa.String(), nullable=True),
    )
    op.execute(
        "UPDATE catalog SET vendor_product_id = "
        "reverse(split_part(reverse(rtrim(product_url, '/')), '/', 1))"
    )
    op.alter_column("catalog", "vendor_product_id", nullable=False)
    op.create_index(
        "ix_catalog_vendor_product_id",
        "catalog",
        ["vendor_name", "vendor_product_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_catalog_vendor_product_id", table_name="catalog")
    op.drop_column("catalog", "vendor_product_id")
