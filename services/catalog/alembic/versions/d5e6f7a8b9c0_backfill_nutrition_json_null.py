"""backfill nutrition JSON 'null' to SQL NULL

Existing rows could store a missing nutrition value as the JSON literal 'null'
(SQLAlchemy's JSON default persists Python None that way). Readers test the
column with SQL ``IS NULL`` (requeue backfill, /catalog/stats), so those rows
were invisible: food items stuck without nutrition were never re-enqueued.
Normalize them to SQL NULL; the model now uses none_as_null=True so new writes
stay consistent.

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-06-27 00:00:00.000000

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d5e6f7a8b9c0"
down_revision: str | Sequence[str] | None = "c4d5e6f7a8b9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # jsonb cast normalizes whitespace so the literal 'null' matches exactly.
    op.execute("UPDATE catalog SET nutrition = NULL WHERE nutrition::jsonb = 'null'::jsonb")


def downgrade() -> None:
    # Data-only normalization; the original SQL NULL vs JSON 'null' distinction
    # cannot be reconstructed, so there is nothing to revert.
    pass
