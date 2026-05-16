"""migrate keycloak to firebase

Revision ID: b89d41b1f01b
Revises: 1150aacc045e
Create Date: 2026-05-16 14:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b89d41b1f01b"
down_revision: str | Sequence[str] | None = "2_create_default_user"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_index("ix_users_keycloak_id", table_name="users")
    op.alter_column("users", "keycloak_id", new_column_name="firebase_uid")
    op.create_index(op.f("ix_users_firebase_uid"), "users", ["firebase_uid"], unique=True)
    op.drop_column("users", "hashed_password")


def downgrade() -> None:
    op.add_column(
        "users",
        sa.Column("hashed_password", sa.String(length=255), nullable=True),
    )
    op.drop_index(op.f("ix_users_firebase_uid"), table_name="users")
    op.alter_column("users", "firebase_uid", new_column_name="keycloak_id")
    op.create_index("ix_users_keycloak_id", "users", ["keycloak_id"], unique=True)
