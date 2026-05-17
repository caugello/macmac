"""add group invitations table

Revision ID: c3a1f7e82d4a
Revises: b89d41b1f01b
Create Date: 2026-05-17 04:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c3a1f7e82d4a"
down_revision: str | Sequence[str] | None = "b89d41b1f01b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "group_invitations",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("group_id", sa.UUID(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("invited_by", sa.UUID(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
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
        sa.ForeignKeyConstraint(["group_id"], ["groups.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["invited_by"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_group_invitations_email", "group_invitations", ["email"])
    op.create_index("ix_group_invitations_group_id", "group_invitations", ["group_id"])
    op.create_index("ix_group_invitations_status", "group_invitations", ["status"])


def downgrade() -> None:
    op.drop_index("ix_group_invitations_status", table_name="group_invitations")
    op.drop_index("ix_group_invitations_group_id", table_name="group_invitations")
    op.drop_index("ix_group_invitations_email", table_name="group_invitations")
    op.drop_table("group_invitations")
