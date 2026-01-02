from services.framework.app import create_microservice
from services.recipes.db import SessionLocal
from services.shared.lib.db import get_db


def recipes_db():
    return get_db(SessionLocal)


app = create_microservice("recipes", recipes_db)
