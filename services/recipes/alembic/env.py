import os
import sys

# Add project root to path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
sys.path.insert(0, BASE_DIR)

from services.recipes.models import Recipe  # noqa: E402
from services.shared.alembic import configure_alembic_env  # noqa: E402

# Configure Alembic for recipes service
configure_alembic_env("recipes", Recipe.metadata)
