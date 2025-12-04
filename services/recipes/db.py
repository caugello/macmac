from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from services.config import get_config_for_service

# Example: Change host/db/user/pass for your OpenShift Postgres service
DATABASE_URL = get_config_for_service("recipes").db

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
