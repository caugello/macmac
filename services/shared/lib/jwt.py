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

ALGORITHM = config.auth.jwt.algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = config.auth.jwt.access_token_expire_minutes


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
