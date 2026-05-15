import jwt
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from services.auth.security import decode_access_token
from services.framework.user_context import set_user_context
from pydantic import UUID4

# Public routes that don't require authentication
PUBLIC_ROUTES = {
    "/api/v1/auth/login",
    "/api/v1/auth/register",  # Future
    "/healthz",
}


class AuthenticationMiddleware(BaseHTTPMiddleware):
    """
    Gateway-level authentication middleware.
    Validates JWT tokens and sets user context for downstream services.
    """

    async def dispatch(self, request, call_next):
        # Skip auth for public routes
        if request.url.path in PUBLIC_ROUTES:
            return await call_next(request)

        # Extract token from Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing or invalid authorization header"}
            )

        token = auth_header.split(" ")[1]

        try:
            # Decode and validate token
            payload = decode_access_token(token)

            # Extract user context from token - decode_access_token already validates these exist
            user_id_str = payload["sub"]
            username = payload["username"]

            # Parse UUID from string
            try:
                user_id = UUID4(user_id_str)
            except (ValueError, TypeError) as e:
                raise ValueError(f"Invalid UUID format for user_id: {user_id_str}")

            # Parse group IDs (may be empty list)
            group_ids = []
            for gid in payload.get("groups", []):
                try:
                    group_ids.append(UUID4(gid))
                except (ValueError, TypeError):
                    # Skip invalid group IDs rather than failing the whole request
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.warning(f"Skipping invalid group ID: {gid}")
                    continue

            # Set user context for this request
            set_user_context(user_id, username, group_ids)

            # Add user context to request headers for downstream services
            request.state.user_id = str(user_id)
            request.state.username = username
            request.state.group_ids = [str(gid) for gid in group_ids]

        except jwt.InvalidTokenError as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Invalid JWT token: {str(e)}")
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid or expired token"}
            )
        except ValueError as e:
            # UUID parsing errors
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Token payload parsing error: {str(e)}")
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid token format"}
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Authentication error: {str(e)}", exc_info=True)
            return JSONResponse(
                status_code=500,
                content={"detail": "Authentication service unavailable"}
            )

        response = await call_next(request)
        return response
