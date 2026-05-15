import contextvars

from pydantic import UUID4

from services.shared.schemas.auth import UserContext

# Context variable for current authenticated user
current_user: contextvars.ContextVar[UserContext | None] = contextvars.ContextVar(
    "current_user", default=None
)


def set_user_context(user_id: UUID4, username: str, group_ids: list[UUID4]):
    """Set current user context from decoded JWT"""
    ctx = UserContext(user_id=user_id, username=username, group_ids=group_ids)
    current_user.set(ctx)


def get_user_context() -> UserContext | None:
    """Get current user context"""
    return current_user.get()


def require_user_context() -> UserContext:
    """Get user context, raise error if not authenticated"""
    ctx = current_user.get()
    if ctx is None:
        from fastapi import HTTPException

        raise HTTPException(status_code=401, detail="Authentication required")
    return ctx
