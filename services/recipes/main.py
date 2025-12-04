from services.framework.app import create_microservice
from services.recipes.dependencies import get_db

app = create_microservice("recipes", get_db)
