"""
Shared database configuration factory for MacMac services.

This module provides centralized, environment-aware database setup that:
- Leverages db_pool.py for production-ready connection pooling
- Supports per-service configuration from config.yaml
- Handles both runtime and migration use cases
- Provides a single declarative base for all models

Usage in service db.py:
    from services.shared.lib.database import create_service_database

    engine, SessionLocal, Base = create_service_database("recipes")
"""

import os

from sqlalchemy import Engine
from sqlalchemy.orm import declarative_base, sessionmaker

from services.config import get_config_for_service
from services.shared.lib.db_pool import create_monitored_engine


def get_db_url(service_name: str) -> str:
    """
    Get database URL for a service.

    Checks environment variable first (for containers, migrations),
    then falls back to config.yaml.

    Args:
        service_name: Name of the service (e.g., "recipes", "catalog")

    Returns:
        Database connection URL

    Example:
        >>> get_db_url("recipes")
        'postgresql://user:pass@localhost:5432/recipes_db'
    """
    env_var = f"{service_name.upper()}_DATABASE_URL"
    db_url = os.getenv(env_var)

    if not db_url:
        config = get_config_for_service(service_name)
        db_url = config.db

    return db_url


def create_service_database(service_name: str) -> tuple[Engine, sessionmaker, type]:
    """
    Create database engine, session factory, and declarative base for a service.

    Uses environment-aware connection pooling from db_pool.py:
    - Development: 5 base connections, 10 overflow
    - Testing: No pooling (clean state)
    - Staging: 10 base, 20 overflow
    - Production: 15 base, 25 overflow (40 total capacity)

    Args:
        service_name: Name of the service (e.g., "recipes", "catalog")

    Returns:
        Tuple of (engine, SessionLocal, Base)
        - engine: SQLAlchemy Engine with environment-aware pooling
        - SessionLocal: Session factory (sessionmaker)
        - Base: Declarative base for models

    Example:
        >>> engine, SessionLocal, Base = create_service_database("recipes")
        >>> # In models.py:
        >>> class Recipe(Base):
        ...     __tablename__ = "recipes"
    """
    db_url = get_db_url(service_name)

    # Use monitored engine with environment-aware pooling
    engine = create_monitored_engine(service_name, db_url)

    # Create session factory
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    # Create declarative base
    Base = declarative_base()

    return engine, SessionLocal, Base
