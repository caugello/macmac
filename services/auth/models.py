from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, String, Table, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from services.auth.db import Base
from services.shared.models import BaseModel

# Association table for many-to-many user-group relationship
user_groups = Table(
    "user_groups",
    Base.metadata,
    Column(
        "user_id", UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    ),
    Column(
        "group_id",
        UUID(as_uuid=True),
        ForeignKey("groups.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column("created_at", DateTime(timezone=True), server_default=func.now(), nullable=False),
)


class User(BaseModel, Base):
    """User account synced from Firebase Authentication"""

    __tablename__ = "users"

    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)

    firebase_uid = Column(String(255), unique=True, nullable=True, index=True)

    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    groups = relationship("Group", secondary=user_groups, back_populates="members")
    owned_groups = relationship("Group", back_populates="owner", foreign_keys="Group.owner_id")

    __table_args__ = (
        Index("ix_users_username", "username"),
        Index("ix_users_email", "email"),
    )


class Group(BaseModel, Base):
    """User groups (families, households) for shared recipes and meal plans"""

    __tablename__ = "groups"

    name = Column(String(200), nullable=False)

    # Optional: group owner (for admin operations)
    owner_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    members = relationship("User", secondary=user_groups, back_populates="groups")
    owner = relationship("User", back_populates="owned_groups", foreign_keys=[owner_id])

    __table_args__ = (Index("ix_groups_owner_id", "owner_id"),)
