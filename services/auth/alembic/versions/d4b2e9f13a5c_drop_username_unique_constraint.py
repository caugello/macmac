"""drop username unique constraint

Revision ID: d4b2e9f13a5c
Revises: c3a1f7e82d4a
Create Date: 2026-05-17 05:00:00.000000

"""

from collections.abc import Sequence

from alembic import op

revision: str = "d4b2e9f13a5c"
down_revision: str | Sequence[str] | None = "c3a1f7e82d4a"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_index("ix_users_username", table_name="users")
    op.create_index("ix_users_username", "users", ["username"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_users_username", table_name="users")
    op.create_index("ix_users_username", "users", ["username"], unique=True)
