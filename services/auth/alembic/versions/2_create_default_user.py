"""create default user and group

Revision ID: 2_create_default_user
Revises: 1150aacc045e
Create Date: 2026-05-15 09:00:00.000000

"""
import os
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision: str = '2_create_default_user'
down_revision: Union[str, None] = '1150aacc045e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    if os.getenv("ENVIRONMENT") not in (None, "development"):
        print("Skipping seed data — not in development environment")
        return

    conn = op.get_bind()

    # Check if user already exists
    result = conn.execute(text("SELECT id FROM users WHERE username = 'christophe'"))
    existing_user = result.fetchone()

    if not existing_user:
        # Import bcrypt to hash password
        import bcrypt
        password_hash = bcrypt.hashpw(b"test", bcrypt.gensalt()).decode('utf-8')

        # Generate UUIDs for user and group
        import uuid
        user_id = str(uuid.uuid4())
        group_id = str(uuid.uuid4())

        # Insert user
        conn.execute(
            text("""
                INSERT INTO users (id, username, email, hashed_password, is_active)
                VALUES (:id, :username, :email, :hashed_password, :is_active)
            """),
            {
                "id": user_id,
                "username": "christophe",
                "email": "christophe@example.com",
                "hashed_password": password_hash,
                "is_active": True
            }
        )

        # Insert default group
        conn.execute(
            text("""
                INSERT INTO groups (id, name, owner_id)
                VALUES (:id, :name, :owner_id)
            """),
            {
                "id": group_id,
                "name": "Christophe's Family",
                "owner_id": user_id
            }
        )

        # Add user to group
        conn.execute(
            text("""
                INSERT INTO user_groups (user_id, group_id)
                VALUES (:user_id, :group_id)
            """),
            {
                "user_id": user_id,
                "group_id": group_id
            }
        )

        print(f"✅ Created default user 'christophe' with ID: {user_id}")
        print(f"✅ Created default group 'Christophe's Family' with ID: {group_id}")
    else:
        print("ℹ️  Default user 'christophe' already exists, skipping")


def downgrade() -> None:
    # Remove default user and group
    conn = op.get_bind()

    # Get user ID
    result = conn.execute(text("SELECT id FROM users WHERE username = 'christophe'"))
    user_row = result.fetchone()

    if user_row:
        user_id = user_row[0]

        # Delete from user_groups
        conn.execute(
            text("DELETE FROM user_groups WHERE user_id = :user_id"),
            {"user_id": user_id}
        )

        # Delete groups owned by this user
        conn.execute(
            text("DELETE FROM groups WHERE owner_id = :user_id"),
            {"user_id": user_id}
        )

        # Delete user
        conn.execute(
            text("DELETE FROM users WHERE id = :user_id"),
            {"user_id": user_id}
        )

        print(f"✅ Removed default user 'christophe'")
