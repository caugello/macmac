from services.framework.app import create_microservice
from services.auth.db import get_db

# Create auth service using the framework
app = create_microservice("auth", get_db=get_db)
