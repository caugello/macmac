from sqlalchemy import Column, String, DateTime, ForeignKey, Table, Index, Boolean, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from services.auth.db import Base
from services.shared.models import BaseModel

# Association table for many-to-many user-group relationship
user_groups = Table(
    'user_groups',
    Base.metadata,
    Column('user_id', UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('group_id', UUID(as_uuid=True), ForeignKey('groups.id', ondelete='CASCADE'), primary_key=True),
    Column('created_at', DateTime(timezone=True), server_default=func.now(), nullable=False),
)


class User(BaseModel, Base):
    """User account - MVP uses hardcoded credentials, future: Keycloak sync"""
    __tablename__ = "users"

    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)

    # MVP: store hashed password (bcrypt)
    # Future: remove when Keycloak integration complete
    hashed_password = Column(String(255), nullable=True)

    # Keycloak integration fields (for future use)
    keycloak_id = Column(String(255), unique=True, nullable=True, index=True)

    # Active flag for soft delete
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    groups = relationship("Group", secondary=user_groups, back_populates="members")
    owned_groups = relationship("Group", back_populates="owner", foreign_keys="Group.owner_id")

    __table_args__ = (
        Index('ix_users_username', 'username'),
        Index('ix_users_email', 'email'),
    )


class Group(BaseModel, Base):
    """User groups (families, households) for shared recipes and meal plans"""
    __tablename__ = "groups"

    name = Column(String(200), nullable=False)

    # Optional: group owner (for admin operations)
    owner_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)

    # Relationships
    members = relationship("User", secondary=user_groups, back_populates="groups")
    owner = relationship("User", back_populates="owned_groups", foreign_keys=[owner_id])

    __table_args__ = (
        Index('ix_groups_owner_id', 'owner_id'),
    )
