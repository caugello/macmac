from sqlalchemy.orm import Session
from services.shared.lib.database import create_service_database

engine, SessionLocal, Base = create_service_database("auth")


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
