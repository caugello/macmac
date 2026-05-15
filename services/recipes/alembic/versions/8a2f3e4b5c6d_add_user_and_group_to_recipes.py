"""add user and group to recipes

Revision ID: 8a2f3e4b5c6d
Revises: f539dfed1bb9
Create Date: 2026-05-15 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '8a2f3e4b5c6d'
down_revision: Union[str, None] = 'f539dfed1bb9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add user_id and group_id columns to recipes
    op.add_column('recipes', sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('recipes', sa.Column('group_id', postgresql.UUID(as_uuid=True), nullable=True))

    # Create indexes for performance
    op.create_index('ix_recipes_user_id', 'recipes', ['user_id'])
    op.create_index('ix_recipes_group_id', 'recipes', ['group_id'])
    op.create_index('ix_recipes_user_group', 'recipes', ['user_id', 'group_id'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_recipes_user_group', table_name='recipes')
    op.drop_index('ix_recipes_group_id', table_name='recipes')
    op.drop_index('ix_recipes_user_id', table_name='recipes')

    # Drop columns
    op.drop_column('recipes', 'group_id')
    op.drop_column('recipes', 'user_id')
