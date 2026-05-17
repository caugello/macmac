from services.catalog.db import SessionLocal
from services.framework.app import create_microservice
from services.shared.lib.db import get_db


def catalog_db():
    with get_db(SessionLocal) as db:
        yield db


app = create_microservice("catalog", catalog_db)
