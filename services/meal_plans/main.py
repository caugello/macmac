from services.framework.app import create_microservice
from services.meal_plans.db import SessionLocal
from services.shared.lib.db import get_db


def meal_plans_db():
    with get_db(SessionLocal) as db:
        yield db


app = create_microservice("meal_plans", meal_plans_db)
