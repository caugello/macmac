from services.auth.db import get_db
from services.framework.app import create_microservice

# Create auth service using the framework
app = create_microservice("auth", get_db=get_db)
