"""
Redis caching utilities for MacMac services.

Provides cache-aside pattern with automatic serialization/deserialization,
TTL management, and cache invalidation patterns.
"""

import json
import logging
from collections.abc import Callable
from functools import wraps
from typing import Any

import redis
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class CacheConfig:
    """Cache configuration for different environments."""

    def __init__(
        self,
        host: str = "localhost",
        port: int = 6379,
        db: int = 0,
        password: str | None = None,
        socket_timeout: int = 5,
        socket_connect_timeout: int = 5,
        decode_responses: bool = True,
    ):
        self.host = host
        self.port = port
        self.db = db
        self.password = password
        self.socket_timeout = socket_timeout
        self.socket_connect_timeout = socket_connect_timeout
        self.decode_responses = decode_responses

    @classmethod
    def from_url(cls, url: str) -> "CacheConfig":
        """Create config from Redis URL."""
        # redis://[:password@]host:port/db
        import redis as redis_lib

        connection_pool = redis_lib.ConnectionPool.from_url(url)
        params = connection_pool.connection_kwargs
        return cls(
            host=params.get("host", "localhost"),
            port=params.get("port", 6379),
            db=params.get("db", 0),
            password=params.get("password"),
            socket_timeout=params.get("socket_timeout", 5),
            socket_connect_timeout=params.get("socket_connect_timeout", 5),
            decode_responses=params.get("decode_responses", True),
        )


class RedisCache:
    """Redis cache client with automatic serialization."""

    def __init__(self, config: CacheConfig, key_prefix: str = ""):
        self.config = config
        self.key_prefix = key_prefix
        self._client: redis.Redis | None = None

    @property
    def client(self) -> redis.Redis:
        """Lazy connection to Redis."""
        if self._client is None:
            self._client = redis.Redis(
                host=self.config.host,
                port=self.config.port,
                db=self.config.db,
                password=self.config.password,
                socket_timeout=self.config.socket_timeout,
                socket_connect_timeout=self.config.socket_connect_timeout,
                decode_responses=self.config.decode_responses,
            )
        return self._client

    def _make_key(self, key: str) -> str:
        """Prepend key prefix."""
        if self.key_prefix:
            return f"{self.key_prefix}:{key}"
        return key

    def get(self, key: str) -> str | None:
        """Get value from cache."""
        try:
            full_key = self._make_key(key)
            value = self.client.get(full_key)
            if value:
                logger.debug(f"Cache HIT: {full_key}")
            else:
                logger.debug(f"Cache MISS: {full_key}")
            return value
        except redis.RedisError as e:
            logger.warning(f"Redis GET error for key {key}: {e}")
            return None

    def get_json(self, key: str) -> dict | None:
        """Get JSON value from cache and deserialize."""
        value = self.get(key)
        if value:
            try:
                return json.loads(value)
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to decode JSON for key {key}: {e}")
                return None
        return None

    def set(
        self,
        key: str,
        value: str,
        ttl: int | None = None,
    ) -> bool:
        """
        Set value in cache with optional TTL.

        Args:
            key: Cache key
            value: Value to store
            ttl: Time to live in seconds (None = no expiration)

        Returns:
            True if successful, False otherwise
        """
        try:
            full_key = self._make_key(key)
            if ttl:
                result = self.client.setex(full_key, ttl, value)
            else:
                result = self.client.set(full_key, value)
            logger.debug(f"Cache SET: {full_key} (TTL: {ttl})")
            return bool(result)
        except redis.RedisError as e:
            logger.warning(f"Redis SET error for key {key}: {e}")
            return False

    def set_json(
        self,
        key: str,
        value: Any,
        ttl: int | None = None,
    ) -> bool:
        """
        Set JSON-serializable value in cache.

        Args:
            key: Cache key
            value: Value to serialize and store (dict, list, or Pydantic model)
            ttl: Time to live in seconds (None = no expiration)

        Returns:
            True if successful, False otherwise
        """
        try:
            # Handle Pydantic models
            if isinstance(value, BaseModel):
                json_value = value.model_dump_json()
            else:
                json_value = json.dumps(value)
            return self.set(key, json_value, ttl)
        except (TypeError, ValueError) as e:
            logger.warning(f"Failed to serialize value for key {key}: {e}")
            return False

    def delete(self, *keys: str) -> int:
        """
        Delete one or more keys from cache.

        Returns:
            Number of keys deleted
        """
        try:
            full_keys = [self._make_key(k) for k in keys]
            deleted = self.client.delete(*full_keys)
            logger.debug(f"Cache DELETE: {full_keys} ({deleted} deleted)")
            return deleted
        except redis.RedisError as e:
            logger.warning(f"Redis DELETE error: {e}")
            return 0

    def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching pattern.

        Args:
            pattern: Pattern with wildcards (e.g., "recipes:*")

        Returns:
            Number of keys deleted
        """
        try:
            full_pattern = self._make_key(pattern)
            deleted = 0
            batch = []
            for key in self.client.scan_iter(match=full_pattern, count=100):
                batch.append(key)
                if len(batch) >= 100:
                    deleted += self.client.delete(*batch)
                    batch = []
            if batch:
                deleted += self.client.delete(*batch)
            logger.debug(f"Cache DELETE pattern: {full_pattern} ({deleted} deleted)")
            return deleted
        except redis.RedisError as e:
            logger.warning(f"Redis DELETE pattern error: {e}")
            return 0

    def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        try:
            full_key = self._make_key(key)
            return bool(self.client.exists(full_key))
        except redis.RedisError as e:
            logger.warning(f"Redis EXISTS error for key {key}: {e}")
            return False

    def ping(self) -> bool:
        """Check if Redis is accessible."""
        try:
            return self.client.ping()
        except redis.RedisError:
            return False

    def flushdb(self) -> bool:
        """Clear all keys in current database (use with caution!)."""
        try:
            self.client.flushdb()
            logger.info(f"Flushed Redis DB {self.config.db}")
            return True
        except redis.RedisError as e:
            logger.warning(f"Redis FLUSHDB error: {e}")
            return False


def cached(
    cache: RedisCache,
    ttl: int = 300,
    key_builder: Callable | None = None,
):
    """
    Decorator for caching function results.

    Args:
        cache: RedisCache instance
        ttl: Time to live in seconds
        key_builder: Optional function to build cache key from function args
                     Signature: (func_name, *args, **kwargs) -> str

    Example:
        @cached(cache, ttl=60)
        async def get_recipe(recipe_id: str):
            return db.query(Recipe).filter(Recipe.id == recipe_id).first()

        # With custom key builder
        def recipe_key(func_name, recipe_id, **kwargs):
            return f"recipe:{recipe_id}"

        @cached(cache, ttl=300, key_builder=recipe_key)
        async def get_recipe(recipe_id: str):
            return db.query(Recipe).filter(Recipe.id == recipe_id).first()
    """

    def decorator(func: Callable):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Build cache key
            if key_builder:
                cache_key = key_builder(func.__name__, *args, **kwargs)
            else:
                # Default key: function_name:arg1:arg2:...
                arg_str = ":".join(str(a) for a in args)
                kwarg_str = ":".join(f"{k}={v}" for k, v in sorted(kwargs.items()))
                parts = [func.__name__, arg_str, kwarg_str]
                cache_key = ":".join(p for p in parts if p)

            # Try to get from cache
            cached_value = cache.get_json(cache_key)
            if cached_value is not None:
                logger.debug(f"Cache hit for {cache_key}")
                return cached_value

            # Cache miss - call function
            logger.debug(f"Cache miss for {cache_key}")
            result = await func(*args, **kwargs)

            # Store in cache
            if result is not None:
                cache.set_json(cache_key, result, ttl)

            return result

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Build cache key
            if key_builder:
                cache_key = key_builder(func.__name__, *args, **kwargs)
            else:
                arg_str = ":".join(str(a) for a in args)
                kwarg_str = ":".join(f"{k}={v}" for k, v in sorted(kwargs.items()))
                parts = [func.__name__, arg_str, kwarg_str]
                cache_key = ":".join(p for p in parts if p)

            # Try to get from cache
            cached_value = cache.get_json(cache_key)
            if cached_value is not None:
                logger.debug(f"Cache hit for {cache_key}")
                return cached_value

            # Cache miss - call function
            logger.debug(f"Cache miss for {cache_key}")
            result = func(*args, **kwargs)

            # Store in cache
            if result is not None:
                cache.set_json(cache_key, result, ttl)

            return result

        # Return appropriate wrapper based on function type
        import inspect

        if inspect.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator


# Singleton cache instances per service
_cache_instances: dict[str, RedisCache] = {}


def get_cache(service_name: str, redis_url: str = "redis://localhost:6379/0") -> RedisCache:
    """
    Get or create cache instance for a service.

    Args:
        service_name: Name of service (used as key prefix)
        redis_url: Redis connection URL

    Returns:
        RedisCache instance for the service
    """
    if service_name not in _cache_instances:
        config = CacheConfig.from_url(redis_url)
        _cache_instances[service_name] = RedisCache(config, key_prefix=service_name)
    return _cache_instances[service_name]


def initialize_service_cache(service_name: str) -> RedisCache:
    """
    Initialize cache for a service using config.yaml + REDIS_PASSWORD environment variable.

    This is a convenience function that automatically constructs the Redis URL
    by combining configuration from config.yaml with the REDIS_PASSWORD environment
    variable (if set).

    Replaces the common pattern:
        redis_password = os.getenv("REDIS_PASSWORD")
        if redis_password:
            redis_url = f"redis://:{redis_password}@{config.cache.host}:{config.cache.port}/{config.cache.db}"
        else:
            redis_url = f"redis://{config.cache.host}:{config.cache.port}/{config.cache.db}"
        cache = get_cache(service_name, redis_url)

    Args:
        service_name: Name of the service (e.g., "recipes", "catalog", "meal_plans")

    Returns:
        RedisCache instance configured for the service

    Example:
        from services.shared.lib.cache import initialize_service_cache

        cache = initialize_service_cache("recipes")
    """
    import os

    from services.config import get_config

    config = get_config()

    # Allow environment variables to override config.yaml for container deployments
    redis_host = os.getenv("REDIS_HOST", config.cache.host)
    redis_port = os.getenv("REDIS_PORT", str(config.cache.port))
    redis_db = os.getenv("REDIS_DB", str(config.cache.db))
    redis_password = os.getenv("REDIS_PASSWORD")

    if redis_password:
        redis_url = f"redis://:{redis_password}@{redis_host}:{redis_port}/{redis_db}"
    else:
        redis_url = f"redis://{redis_host}:{redis_port}/{redis_db}"

    return get_cache(service_name, redis_url)
