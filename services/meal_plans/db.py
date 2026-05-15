from services.shared.lib.database import create_service_database

engine, SessionLocal, Base = create_service_database("meal_plans")
