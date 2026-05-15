"""
Base model classes and mixins for SQLAlchemy models.

This module provides reusable mixins to eliminate duplicate column definitions
across services. All MacMac models should inherit from BaseModel or compose
specific mixins as needed.

Usage:
    from services.shared.models import BaseModel, UserOwnershipMixin

    class Recipe(BaseModel, UserOwnershipMixin, Base):
        __tablename__ = "recipes"

        title = Column(String, nullable=False)
        # No need to define id, created_at, updated_at, user_id, group_id
"""

import uuid
from sqlalchemy import Column, DateTime, func
from sqlalchemy.dialects.postgresql import UUID


class UUIDPrimaryKeyMixin:
    """
    Mixin that adds a UUID primary key column.

    Automatically generates a new UUID4 for each row.

    Attributes:
        id: UUID primary key
    """

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


class TimestampMixin:
    """
    Mixin that adds automatic timestamp columns.

    created_at is set once on insertion, updated_at is refreshed on every update.

    Attributes:
        created_at: Timestamp when row was created (timezone-aware)
        updated_at: Timestamp when row was last updated (timezone-aware)
    """

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class UserOwnershipMixin:
    """
    Mixin that adds user and group ownership columns for multi-tenant access control.

    Supports both individual user ownership and group-based sharing.
    Both columns are indexed for efficient filtering.

    Attributes:
        user_id: UUID of the user who owns this resource (nullable for migration compatibility)
        group_id: UUID of the group this resource is shared with (nullable for private resources)
    """

    user_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    group_id = Column(UUID(as_uuid=True), nullable=True, index=True)


class BaseModel(UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Standard base model for all MacMac entities.

    Combines UUID primary key and automatic timestamps.
    Use this as the base for models that don't need user ownership.

    This is an abstract base - it won't create a table itself.

    Example:
        class Recipe(BaseModel, UserOwnershipMixin, Base):
            __tablename__ = "recipes"
            title = Column(String, nullable=False)
    """

    __abstract__ = True
