import os
import sys
from datetime import datetime, timedelta
from typing import Optional
import jwt
import bcrypt
from pydantic import UUID4
from keycloak import KeycloakOpenID
import logging

from services.config import get_config

logger = logging.getLogger(__name__)

# Load configuration
config = get_config()

# JWT Configuration - SECRET_KEY comes from environment (SECURITY REQUIREMENT)
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    logger.critical("JWT_SECRET_KEY environment variable not set!")
    # In development, use a generated key but warn
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

# Algorithm and token expiration from config.yaml
ALGORITHM = config.auth.jwt.algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = config.auth.jwt.access_token_expire_minutes

# Keycloak Configuration - URLs and IDs from config.yaml, SECRET from environment
KEYCLOAK_URL = config.auth.keycloak.url
KEYCLOAK_REALM = config.auth.keycloak.realm
KEYCLOAK_CLIENT_ID = config.auth.keycloak.client_id
KEYCLOAK_CLIENT_SECRET = os.getenv("KEYCLOAK_CLIENT_SECRET")
if not KEYCLOAK_CLIENT_SECRET:
    if os.getenv("ENVIRONMENT") != "development":
        logger.critical("KEYCLOAK_CLIENT_SECRET not set — cannot start in production")
        sys.exit(1)
    KEYCLOAK_CLIENT_SECRET = "dev-only-keycloak-secret"
    logger.warning("Using development Keycloak secret — DO NOT USE IN PRODUCTION")

# Initialize Keycloak client
keycloak_openid = KeycloakOpenID(
    server_url=KEYCLOAK_URL,
    client_id=KEYCLOAK_CLIENT_ID,
    realm_name=KEYCLOAK_REALM,
    client_secret_key=KEYCLOAK_CLIENT_SECRET,
)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def get_password_hash(password: str) -> str:
    """Hash a password for storage"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def create_access_token(user_id: UUID4, username: str, group_ids: list[UUID4]) -> str:
    """
    Create JWT access token with user_id, username, and group memberships.
    Token structure allows gateway to extract user context without DB calls.
    """
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),  # subject = user_id
        "username": username,
        "groups": [str(gid) for gid in group_ids],
        "exp": expire,
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """
    Decode and validate JWT token.
    Tries Keycloak validation first, falls back to self-signed JWT.
    Returns payload dict with user_id, username, groups.
    Raises jwt.InvalidTokenError on validation failure.
    """
    # Try self-signed JWT first (faster, no network call)
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.InvalidTokenError:
        pass

    # Fall back to Keycloak RS256 validation
    try:
        public_key = (
            "-----BEGIN PUBLIC KEY-----\n"
            + keycloak_openid.public_key()
            + "\n-----END PUBLIC KEY-----"
        )

        token_info = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options={"verify_aud": False, "verify_exp": True},
        )

        user_id = token_info.get("sub")
        username = token_info.get("preferred_username") or token_info.get("username")

        if not user_id:
            raise jwt.InvalidTokenError("Token missing 'sub' claim")
        if not username:
            raise jwt.InvalidTokenError("Token missing username claim")

        return {
            "sub": str(user_id),
            "username": username,
            "groups": [],
            "exp": token_info.get("exp"),
            "iat": token_info.get("iat"),
        }
    except Exception as keycloak_error:
        logger.warning(f"Keycloak token validation failed: {keycloak_error}")
        raise jwt.InvalidTokenError(f"Token validation failed: {keycloak_error}")
