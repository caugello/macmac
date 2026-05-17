import logging
import os
import sys

import jwt

from services.config import get_config

logger = logging.getLogger(__name__)

config = get_config()

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    logger.critical("JWT_SECRET_KEY environment variable not set!")
    if os.getenv("ENVIRONMENT") != "development":
        logger.critical("Cannot start in production without JWT_SECRET_KEY")
        sys.exit(1)
    SECRET_KEY = "dev-only-insecure-key-change-in-production"
    logger.warning("Using development JWT secret - DO NOT USE IN PRODUCTION")

if len(SECRET_KEY) < 32:
    logger.error(
        f"JWT_SECRET_KEY is too short ({len(SECRET_KEY)} chars). Minimum 32 characters recommended."
    )
    if os.getenv("ENVIRONMENT") != "development":
        sys.exit(1)

ALLOWED_ALGORITHMS = ["HS256"]
ALGORITHM = config.auth.jwt.algorithm
if ALGORITHM not in ALLOWED_ALGORITHMS:
    logger.critical(
        f"Configured JWT algorithm '{ALGORITHM}' is not in allowed list: {ALLOWED_ALGORITHMS}"
    )
    sys.exit(1)

ACCESS_TOKEN_EXPIRE_MINUTES = config.auth.jwt.access_token_expire_minutes

_revoked_tokens: set[str] = set()


def revoke_token(jti: str) -> None:
    _revoked_tokens.add(jti)


def is_token_revoked(jti: str) -> bool:
    return jti in _revoked_tokens


def decode_access_token(token: str) -> dict:
    payload = jwt.decode(
        token,
        SECRET_KEY,
        algorithms=ALLOWED_ALGORITHMS,
        issuer="macmac-auth",
        audience="macmac-api",
    )
    jti = payload.get("jti")
    if jti and is_token_revoked(jti):
        raise jwt.InvalidTokenError("Token has been revoked")
    return payload
