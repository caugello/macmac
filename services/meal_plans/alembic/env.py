import os
import sys

# Add project root to path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
sys.path.insert(0, BASE_DIR)

from services.meal_plans.models import MealPlan  # noqa: E402
from services.shared.alembic import configure_alembic_env  # noqa: E402

# Configure Alembic for meal_plans service
configure_alembic_env("meal_plans", MealPlan.metadata)
