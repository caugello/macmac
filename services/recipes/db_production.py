"""
Production-ready database configuration for recipes service.

This is an example of how to use the shared db_pool module.
To use this in production, rename to db.py or import in your existing db.py.
"""

import os

from sqlalchemy.orm import declarative_base, sessionmaker

from services.config import get_config_for_service
from services.shared.lib.db_pool import create_monitored_engine, get_pool_health

# Use environment variable if set (for migrations, containers), otherwise use config.yaml
db_url = os.getenv("RECIPES_DATABASE_URL") or get_config_for_service("recipes").db

# Create engine with production-ready pooling and monitoring
engine = create_monitored_engine(service_name="recipes", db_url=db_url)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


# Health check function (use in FastAPI route)
def get_db_health():
    """Get database pool health metrics."""
    return get_pool_health(engine, "recipes")
