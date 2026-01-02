from fastapi import APIRouter, FastAPI

from services.config import get_config, get_config_for_service
from services.framework.helpers import make_endpoint, resolve_handler
from services.framework.logging import log_event
from services.framework.tracing import tracing_middleware

app_config = get_config()


def create_microservice(service_name: str, get_db=None) -> FastAPI:
    """
    Build a FastAPI microservice dynamically from config.yaml
    """

    # Load config for service (recipes, catalog, pricing, etc)
    service = get_config_for_service(service_name)

    app = FastAPI(
        title=f"{service.name} service", version="1.0", openapi_url=f"/openapi.json"
    )

    router = APIRouter()

    # Register all routes listed under this service config
    for route in service.routes:

        # load crud config
        handler_fn = resolve_handler(route.handler)
        endpoint = make_endpoint(
            route, handler_fn, get_db
        )  # dynamic body/no-body logic

        router.add_api_route(
            route.path,
            endpoint,
            methods=[route.method.upper()],
            response_model=route.response_model,
            summary=route.description,
            tags=[service.name],
        )

        log_event(
            "startup",
            action="route_registration",
            service_name=service_name,
            path=route.path,
            handler=route.handler,
        )

    app.include_router(router)
    app.middleware("http")(tracing_middleware)

    @app.get("/healthz")
    async def health():
        return {"status": "ok"}

    return app
