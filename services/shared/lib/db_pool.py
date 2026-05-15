"""
Production-ready database connection pool configuration.

This module provides centralized, environment-aware connection pool settings
with monitoring, health checks, and graceful degradation.
"""

import logging
import os
from collections.abc import Generator
from contextlib import contextmanager

from sqlalchemy import Engine, create_engine, event, exc
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import NullPool

logger = logging.getLogger(__name__)


class DatabaseConfig:
    """Environment-aware database configuration."""

    def __init__(self, service_name: str, db_url: str):
        self.service_name = service_name
        self.db_url = db_url
        self.env = os.getenv("ENVIRONMENT", "development")

    def get_pool_config(self) -> dict:
        """
        Get pool configuration based on environment.

        Production assumptions:
        - Multiple app instances (3-5 replicas)
        - PostgreSQL max_connections = 200 (default: 100)
        - Need to distribute connections across instances
        """
        configs = {
            "development": {
                "pool_size": 5,
                "max_overflow": 10,
                "pool_timeout": 10,
                "pool_recycle": 3600,
                "pool_pre_ping": True,
                "echo_pool": True,  # Debug pool activity
            },
            "testing": {
                "poolclass": NullPool,  # No pooling in tests (clean state)
            },
            "staging": {
                "pool_size": 10,
                "max_overflow": 20,
                "pool_timeout": 10,
                "pool_recycle": 1800,
                "pool_pre_ping": True,
                "echo_pool": False,
            },
            "production": {
                # Conservative: 200 total DB connections / 5 app instances = 40 per instance
                # Leave 20 for background jobs, admin, monitoring
                "pool_size": 15,  # Base pool (always open)
                "max_overflow": 25,  # Burst capacity (40 total)
                "pool_timeout": 5,  # Fail fast in production
                "pool_recycle": 300,  # Recycle every 5 min (prevent stale connections)
                "pool_pre_ping": True,  # Always verify connection health
                "echo_pool": False,
                # Additional production settings
                "connect_args": {
                    "connect_timeout": 3,
                    "keepalives": 1,
                    "keepalives_idle": 30,
                    "keepalives_interval": 10,
                    "keepalives_count": 5,
                },
            },
        }

        config = configs.get(self.env, configs["development"])
        logger.info(
            f"Database pool config for {self.service_name} ({self.env}): "
            f"pool_size={config.get('pool_size', 'N/A')}, "
            f"max_overflow={config.get('max_overflow', 'N/A')}"
        )
        return config


def create_monitored_engine(service_name: str, db_url: str) -> Engine:
    """
    Create SQLAlchemy engine with monitoring and health checks.

    Args:
        service_name: Name of the service (for logging)
        db_url: Database connection URL

    Returns:
        Configured SQLAlchemy Engine
    """
    config = DatabaseConfig(service_name, db_url)
    pool_config = config.get_pool_config()

    engine = create_engine(db_url, **pool_config)

    # Register event listeners for monitoring
    _register_pool_listeners(engine, service_name)

    return engine


def _register_pool_listeners(engine: Engine, service_name: str):
    """Register SQLAlchemy event listeners for pool monitoring."""

    @event.listens_for(engine, "connect")
    def receive_connect(dbapi_conn, connection_record):
        """Log new connections."""
        logger.debug(f"[{service_name}] New database connection established")

    @event.listens_for(engine, "checkout")
    def receive_checkout(dbapi_conn, connection_record, connection_proxy):
        """Track connection checkout from pool."""
        pool = engine.pool
        logger.debug(
            f"[{service_name}] Connection checkout - "
            f"Pool: {pool.size()}/{pool.size() + pool.overflow()} connections, "
            f"Checked out: {pool.checkedout()}"
        )

    @event.listens_for(engine, "checkin")
    def receive_checkin(dbapi_conn, connection_record):
        """Track connection return to pool."""
        logger.debug(f"[{service_name}] Connection returned to pool")

    @event.listens_for(engine, "close")
    def receive_close(dbapi_conn, connection_record):
        """Log connection closure."""
        logger.debug(f"[{service_name}] Database connection closed")

    @event.listens_for(engine, "detach")
    def receive_detach(dbapi_conn, connection_record):
        """Log connection detachment (removed from pool)."""
        logger.warning(f"[{service_name}] Connection detached from pool")

    @event.listens_for(engine, "soft_invalidate")
    def receive_soft_invalidate(dbapi_conn, connection_record, exception):
        """Log soft invalidation (connection error, will retry)."""
        logger.warning(f"[{service_name}] Connection soft-invalidated: {exception}")

    @event.listens_for(engine, "invalidate")
    def receive_invalidate(dbapi_conn, connection_record, exception):
        """Log hard invalidation (connection permanently failed)."""
        logger.error(f"[{service_name}] Connection invalidated: {exception}")


class PoolHealthCheck:
    """Health check utilities for connection pool."""

    def __init__(self, engine: Engine, service_name: str):
        self.engine = engine
        self.service_name = service_name

    def get_pool_status(self) -> dict:
        """
        Get current pool status metrics.

        Returns:
            Dict with pool metrics for monitoring/observability
        """
        pool = self.engine.pool

        # Calculate utilization percentage
        total_capacity = pool.size() + pool.overflow()
        checked_out = pool.checkedout()
        utilization = (checked_out / total_capacity * 100) if total_capacity > 0 else 0

        status = {
            "service": self.service_name,
            "pool_size": pool.size(),
            "overflow": pool.overflow(),
            "total_capacity": total_capacity,
            "checked_out": checked_out,
            "available": total_capacity - checked_out,
            "utilization_percent": round(utilization, 2),
            "status": self._get_health_status(utilization),
        }

        return status

    def _get_health_status(self, utilization: float) -> str:
        """Determine health status based on pool utilization."""
        if utilization < 50:
            return "healthy"
        elif utilization < 75:
            return "warning"
        elif utilization < 90:
            return "critical"
        else:
            return "exhausted"

    def is_healthy(self) -> bool:
        """Check if pool is healthy."""
        status = self.get_pool_status()
        return status["status"] in ["healthy", "warning"]


@contextmanager
def get_db_with_retry(
    session_factory: sessionmaker, max_retries: int = 3, backoff_factor: float = 0.5
) -> Generator[Session, None, None]:
    """
    Database session with automatic retry on transient failures.

    Args:
        session_factory: SQLAlchemy sessionmaker
        max_retries: Maximum number of retry attempts
        backoff_factor: Exponential backoff multiplier

    Yields:
        Database session

    Example:
        >>> with get_db_with_retry(SessionLocal) as db:
        ...     results = db.query(Model).all()
    """
    import time

    last_error = None

    for attempt in range(max_retries):
        session = session_factory()
        try:
            yield session
            session.commit()
            return
        except exc.OperationalError as e:
            # Transient errors: connection timeout, pool exhaustion
            session.rollback()
            last_error = e

            if attempt < max_retries - 1:
                wait_time = backoff_factor * (2**attempt)
                logger.warning(
                    f"Database operation failed (attempt {attempt + 1}/{max_retries}), "
                    f"retrying in {wait_time}s: {e}"
                )
                time.sleep(wait_time)
            else:
                logger.error(f"Database operation failed after {max_retries} attempts")
        except Exception:
            # Non-transient errors: don't retry
            session.rollback()
            raise
        finally:
            session.close()

    # If we get here, all retries failed
    raise last_error


# FastAPI dependency for health check endpoint
def get_pool_health(engine: Engine, service_name: str) -> dict:
    """
    FastAPI dependency to expose pool health metrics.

    Usage in main.py:
        @app.get("/health/db")
        async def db_health():
            return get_pool_health(engine, "recipes")
    """
    health_check = PoolHealthCheck(engine, service_name)
    return health_check.get_pool_status()
