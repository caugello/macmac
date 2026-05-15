"""
Shared model base classes and mixins for MacMac services.
"""

from .base import BaseModel, TimestampMixin, UUIDPrimaryKeyMixin, UserOwnershipMixin

__all__ = [
    "BaseModel",
    "TimestampMixin",
    "UUIDPrimaryKeyMixin",
    "UserOwnershipMixin",
]
