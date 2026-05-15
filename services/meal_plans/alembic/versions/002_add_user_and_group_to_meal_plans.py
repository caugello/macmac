"""add user and group to meal_plans

Revision ID: 002_add_user_group
Revises: 001_initial
Create Date: 2026-05-15 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002_add_user_group'
down_revision: Union[str, None] = '001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add user_id and group_id columns to meal_plans
    op.add_column('meal_plans', sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('meal_plans', sa.Column('group_id', postgresql.UUID(as_uuid=True), nullable=True))

    # Create indexes for performance
    op.create_index('ix_meal_plans_user_id', 'meal_plans', ['user_id'])
    op.create_index('ix_meal_plans_group_id', 'meal_plans', ['group_id'])
    op.create_index('ix_meal_plans_user_group', 'meal_plans', ['user_id', 'group_id'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_meal_plans_user_group', table_name='meal_plans')
    op.drop_index('ix_meal_plans_group_id', table_name='meal_plans')
    op.drop_index('ix_meal_plans_user_id', table_name='meal_plans')

    # Drop columns
    op.drop_column('meal_plans', 'group_id')
    op.drop_column('meal_plans', 'user_id')
