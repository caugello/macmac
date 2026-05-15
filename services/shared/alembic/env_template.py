"""
Reusable Alembic environment configuration for MacMac services.

This module provides a standard Alembic env.py implementation that eliminates
duplication across service-specific migration environments.

Usage in services/{service}/alembic/env.py:
    import os
    import sys

    # Add project root to path
    BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
    sys.path.insert(0, BASE_DIR)

    from services.shared.alembic import configure_alembic_env
    from services.recipes.models import Recipe

    configure_alembic_env("recipes", Recipe.metadata)
"""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import MetaData, engine_from_config, pool

from services.shared.lib.database import get_db_url


def configure_alembic_env(service_name: str, target_metadata: MetaData):
    """
    Configure Alembic environment for a service.

    Handles database URL loading, offline/online migration modes, and metadata setup.
    Replaces 85+ lines of boilerplate env.py code with a single function call.

    Args:
        service_name: Name of the service (e.g., "recipes", "catalog", "meal_plans", "auth")
        target_metadata: SQLAlchemy metadata object from the service's models
                        (e.g., Recipe.metadata, CatalogItem.metadata)

    Example:
        >>> # In services/recipes/alembic/env.py:
        >>> from services.shared.alembic import configure_alembic_env
        >>> from services.recipes.models import Recipe
        >>> configure_alembic_env("recipes", Recipe.metadata)

    How it works:
        1. Loads database URL from shared database configuration (environment variable or config.yaml)
        2. Configures Alembic with the target metadata
        3. Runs migrations in offline or online mode based on Alembic invocation
    """
    # Get database URL from shared configuration
    # Checks environment variable first (e.g., RECIPES_DATABASE_URL), then config.yaml
    db_url = get_db_url(service_name)

    # Get the Alembic Config object
    config = context.config
    config.set_main_option("sqlalchemy.url", str(db_url))

    # Interpret the config file for Python logging
    if config.config_file_name is not None:
        fileConfig(config.config_file_name)

    def run_migrations_offline() -> None:
        """
        Run migrations in 'offline' mode.

        This configures the context with just a URL and not an Engine.
        By skipping the Engine creation we don't even need a DBAPI to be available.

        Calls to context.execute() here emit the given string to the script output.
        """
        url = config.get_main_option("sqlalchemy.url")
        context.configure(
            url=url,
            target_metadata=target_metadata,
            literal_binds=True,
            dialect_opts={"paramstyle": "named"},
        )

        with context.begin_transaction():
            context.run_migrations()

    def run_migrations_online() -> None:
        """
        Run migrations in 'online' mode.

        In this scenario we need to create an Engine and associate a connection
        with the context.
        """
        connectable = engine_from_config(
            config.get_section(config.config_ini_section, {}),
            prefix="sqlalchemy.",
            poolclass=pool.NullPool,
        )

        with connectable.connect() as connection:
            context.configure(connection=connection, target_metadata=target_metadata)

            with context.begin_transaction():
                context.run_migrations()

    # Run migrations based on mode
    if context.is_offline_mode():
        run_migrations_offline()
    else:
        run_migrations_online()
