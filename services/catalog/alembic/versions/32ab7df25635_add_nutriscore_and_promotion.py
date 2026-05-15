"""add_nutriscore_and_promotion

Revision ID: 32ab7df25635
Revises: 19f2be905e1d
Create Date: 2026-05-15 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "32ab7df25635"
down_revision: str | Sequence[str] | None = "19f2be905e1d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("catalog", sa.Column("nutriscore", sa.String(), nullable=True))
    op.add_column("catalog", sa.Column("nutriscore_svg", sa.Text(), nullable=True))
    op.add_column("catalog", sa.Column("promotion_until_date", sa.Date(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("catalog", "promotion_until_date")
    op.drop_column("catalog", "nutriscore_svg")
    op.drop_column("catalog", "nutriscore")
