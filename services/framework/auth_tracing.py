import logging

import jwt
from pydantic import UUID4

from services.framework.user_context import current_token, current_user, set_user_context
from services.shared.lib.jwt import decode_access_token

logger = logging.getLogger(__name__)

# JWT-per-service: each backend verifies the JWT independently instead of
# trusting gateway-injected headers, preventing auth bypass via header spoofing.


async def auth_tracing_middleware(request, call_next):
    """Verify the forwarded JWT and populate user contextvars.

    Unauthenticated requests (health checks, public routes) pass through
    without user context — downstream handlers call require_user_context()
    to enforce auth.
    """
    current_user.set(None)
    current_token.set(None)
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        try:
            payload = decode_access_token(token)
            user_id = UUID4(payload["sub"])
            username = payload["username"]
            group_ids = [UUID4(g) for g in payload.get("groups", [])]
            set_user_context(user_id, username, group_ids)
            current_token.set(token)
        except (jwt.InvalidTokenError, KeyError, ValueError, TypeError) as e:
            logger.warning("Backend JWT verification failed: %s", e)

    response = await call_next(request)
    return response
