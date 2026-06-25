"""add my_list_items table

Revision ID: 004_add_my_list
Revises: 003_add_notes
Create Date: 2026-06-24 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "004_add_my_list"
down_revision: str | None = "003_add_notes"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "my_list_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("catalog_item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("brand", sa.String(), nullable=True),
        sa.Column("price", sa.Float(), nullable=True),
        sa.Column("image_url", sa.String(), nullable=True),
        sa.Column("nutriscore", sa.String(), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("group_id", postgresql.UUID(as_uuid=True), nullable=True),
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
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "catalog_item_id", name="uq_my_list_user_catalog_item"),
    )

    op.create_index("ix_my_list_items_user_id", "my_list_items", ["user_id"])
    op.create_index("ix_my_list_items_group_id", "my_list_items", ["group_id"])


def downgrade() -> None:
    op.drop_index("ix_my_list_items_group_id", table_name="my_list_items")
    op.drop_index("ix_my_list_items_user_id", table_name="my_list_items")
    op.drop_table("my_list_items")
