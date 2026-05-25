"""add last_enriched_at to catalog

Revision ID: b3c4d5e6f7a8
Revises: 0c753e295016
Create Date: 2026-05-25 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b3c4d5e6f7a8"
down_revision: str | Sequence[str] | None = "0c753e295016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "catalog",
        sa.Column("last_enriched_at", sa.DateTime(timezone=True), nullable=True),
    )
    # Backfill existing rows from updated_at
    op.execute("UPDATE catalog SET last_enriched_at = updated_at")


def downgrade() -> None:
    op.drop_column("catalog", "last_enriched_at")
