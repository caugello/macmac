import importlib

from fastapi import Query


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
    """

    qp_fields = (
        route.query_params if hasattr(route, "query_params") else ["limit", "offset"]
    )

    # Build dependency function with parameters dynamically
    def query_dep(
        limit: int = Query(None, ge=0, description="Max results"),
        offset: int = Query(0, ge=0, description="Result offset index"),
        search: str = Query(None, description="Search text"),
    ):
        # Returned dict becomes **kwargs to the CRUD handler
        return {
            "limit": limit or 100,
            "offset": offset,
            "search": search,
        }

    return query_dep
