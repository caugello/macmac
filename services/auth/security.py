import logging
import os
import sys
from datetime import UTC, datetime, timedelta

import firebase_admin
import jwt
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials
from pydantic import UUID4

from services.config import get_config
from services.shared.lib.jwt import (
    ALGORITHM,
    SECRET_KEY,
    decode_access_token,
)

logger = logging.getLogger(__name__)

config = get_config()

ACCESS_TOKEN_EXPIRE_MINUTES = config.auth.jwt.access_token_expire_minutes

# Initialize Firebase Admin SDK
# Uses GOOGLE_APPLICATION_CREDENTIALS env var for service account JSON path
if not firebase_admin._apps:
    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if cred_path:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    else:
        if os.getenv("ENVIRONMENT") != "development":
            logger.critical("GOOGLE_APPLICATION_CREDENTIALS not set — cannot start in production")
            sys.exit(1)
        logger.warning(
            "GOOGLE_APPLICATION_CREDENTIALS not set — Firebase token verification will fail"
        )
        firebase_admin.initialize_app()


def verify_firebase_token(id_token: str) -> dict:
    decoded_token = firebase_auth.verify_id_token(id_token)

    if not decoded_token.get("email_verified", False):
        raise ValueError("Email not verified")

    return decoded_token


def create_access_token(user_id: UUID4, username: str, group_ids: list[UUID4]) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "username": username,
        "groups": [str(gid) for gid in group_ids],
        "exp": expire,
        "iat": datetime.now(UTC),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# Re-export for backward compatibility within auth service
__all__ = [
    "verify_firebase_token",
    "create_access_token",
    "decode_access_token",
    "SECRET_KEY",
    "ALGORITHM",
]
