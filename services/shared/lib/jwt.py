import logging
import os
import sys
from datetime import UTC, datetime

import jwt

try:
    import redis
except ModuleNotFoundError:
    redis = None

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

# Redis key prefix for revoked JTIs, shared across all replicas.
REVOCATION_KEY_PREFIX = "jwt:revoked:"

# In-memory fallback used only when Redis is unavailable. This is per-process
# and does not survive restarts, matching the degraded behaviour of the rate
# limiter when Redis is down.
_revoked_tokens_fallback: set[str] = set()

_redis_client = None
_redis_checked = False


def _get_redis():
    """Lazily connect to Redis for the shared revocation list.

    Returns None when Redis is unavailable so callers can fall back to the
    in-memory set.  Caches the result (success or failure) so subsequent
    calls never retry the connection.
    """
    global _redis_client, _redis_checked
    if _redis_checked:
        return _redis_client
    if redis is None:
        _redis_checked = True
        return None
    try:
        cache_cfg = config.cache
        client = redis.Redis(
            host=os.getenv("REDIS_HOST", cache_cfg.host),
            port=int(os.getenv("REDIS_PORT", cache_cfg.port)),
            db=int(os.getenv("REDIS_DB", cache_cfg.db)),
            password=os.getenv("REDIS_PASSWORD"),
            socket_timeout=cache_cfg.socket_timeout,
            socket_connect_timeout=cache_cfg.socket_connect_timeout,
            decode_responses=True,
        )
        client.ping()
        _redis_client = client
        logger.info("JWT revocation using Redis backend")
    except Exception:
        logger.warning("Redis unavailable for JWT revocation, using in-memory fallback")
    _redis_checked = True
    return _redis_client


def revoke_token(jti: str, ttl: int) -> None:
    """Mark a JTI as revoked for `ttl` seconds (the token's remaining lifetime).

    Once the TTL elapses the token would have expired anyway, so there is no
    need to keep the revocation entry beyond that point.
    """
    if ttl <= 0:
        return
    client = _get_redis()
    if client is None:
        _revoked_tokens_fallback.add(jti)
        return
    try:
        client.setex(f"{REVOCATION_KEY_PREFIX}{jti}", ttl, "1")
    except Exception as e:
        logger.warning(f"Redis error revoking token {jti}: {e}")
        _revoked_tokens_fallback.add(jti)


def is_token_revoked(jti: str) -> bool:
    client = _get_redis()
    if client is None:
        return jti in _revoked_tokens_fallback
    try:
        return client.exists(f"{REVOCATION_KEY_PREFIX}{jti}") > 0
    except Exception as e:
        logger.warning(f"Redis error checking revocation for token {jti}: {e}")
        return jti in _revoked_tokens_fallback


def decode_access_token(token: str) -> dict:
    payload = jwt.decode(
        token,
        SECRET_KEY,
        algorithms=ALLOWED_ALGORITHMS,
        issuer="macmac-auth",
        audience="macmac-api",
        options={"require": ["exp", "iat", "sub"]},
    )
    # Only hit Redis after the signature and required claims are verified, so
    # forged or malformed tokens never reach the revocation store.
    jti = payload.get("jti")
    if jti and is_token_revoked(jti):
        raise jwt.InvalidTokenError("Token has been revoked")
    return payload


def token_remaining_ttl(payload: dict) -> int:
    """Seconds until the token's `exp` claim, clamped at 0."""
    exp = payload.get("exp")
    if not exp:
        return 0
    remaining = exp - int(datetime.now(UTC).timestamp())
    return max(remaining, 0)
