from services.framework.tracing import TRACE_ID_HEADER
from services.framework.user_context import set_user_context
from pydantic import UUID4

# Custom headers for user context propagation
USER_ID_HEADER = "X-User-ID"
USERNAME_HEADER = "X-Username"
USER_GROUPS_HEADER = "X-User-Groups"


async def auth_tracing_middleware(request, call_next):
    """
    Extract user context from headers (set by gateway) and populate contextvars.
    Runs after tracing_middleware.
    """
    user_id = request.headers.get(USER_ID_HEADER)
    username = request.headers.get(USERNAME_HEADER)
    groups_str = request.headers.get(USER_GROUPS_HEADER, "")

    if user_id and username:
        try:
            group_ids = [UUID4(g) for g in groups_str.split(",") if g]
            set_user_context(UUID4(user_id), username, group_ids)
        except Exception:
            # If parsing fails, skip setting user context (invalid headers)
            pass

    response = await call_next(request)
    return response
