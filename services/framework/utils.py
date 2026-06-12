import importlib
from datetime import date

from fastapi import Query

MAX_LIMIT = 1000
MAX_OFFSET = 100000
DEFAULT_LIMIT = 100


def import_from_string(path: str):
    """
    Convert 'services.shared.schemas.recipe.RecipeCreate'
    into the real Python class.
    """
    module_path, class_name = path.rsplit(".", 1)
    module = importlib.import_module(module_path)
    return getattr(module, class_name)


def build_query_dependency(route):
    """
    Generate a FastAPI dependency for extracting query params dynamically.
    This enables ?limit=&offset=&search= etc to be passed to CRUD functions.
    Only includes params declared in the route's query_params config.
    """
    param_names = set(route.query_params.keys()) if route.query_params else set()

    def query_dep(
        limit: int = Query(None, ge=0, le=MAX_LIMIT, description="Max results"),
        offset: int = Query(0, ge=0, le=MAX_OFFSET, description="Result offset index"),
        search: str = Query(None, description="Search text"),
        sort: str = Query(None, description="Sort field"),
        category: str = Query(None, description="Filter by category"),
        is_food: bool = Query(None, description="Filter by food/non-food"),
        start_date: date = Query(None, description="Start date (YYYY-MM-DD)"),
        end_date: date = Query(None, description="End date (YYYY-MM-DD)"),
    ):
        all_params = {
            "limit": min(limit or DEFAULT_LIMIT, MAX_LIMIT),
            "offset": min(offset, MAX_OFFSET),
            "search": search,
            "sort": sort,
            "category": category,
            "is_food": is_food,
            "start_date": start_date,
            "end_date": end_date,
        }
        return {k: v for k, v in all_params.items() if k in param_names}

    return query_dep
