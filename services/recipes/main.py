from services.framework.app import create_microservice
from services.recipes.db import SessionLocal
from services.shared.lib.db import get_db


def recipes_db():
    with get_db(SessionLocal) as db:
        yield db


app = create_microservice("recipes", recipes_db)
