from services.catalog.db import SessionLocal
from services.framework.app import create_microservice
from services.shared.lib.db import get_db


def catalog_db():
    return get_db(SessionLocal)


app = create_microservice("catalog", catalog_db)
