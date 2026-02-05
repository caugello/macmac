def get_db(SessionLocal):
    """
    Get a database session.
    """
    db = SessionLocal()
    try:
        return db
    finally:
        db.close()
