from services.framework.app import create_microservice
from services.meal_plans.db import SessionLocal
from services.shared.lib.db import get_db


def meal_plans_db():
    yield from get_db(SessionLocal)


app = create_microservice("meal_plans", meal_plans_db)
