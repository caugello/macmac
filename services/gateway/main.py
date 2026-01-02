import uuid

import httpx
from fastapi import Body, Depends, FastAPI, Request
from fastapi.responses import Response

from services.config import get_config
from services.framework.logging import log_event
from services.framework.tracing import TRACE_ID_HEADER
from services.gateway.middleware import GatewayLoggingMiddleware

config = get_config()

app = FastAPI(
    title=f"{config.title} Gateway", version=config.version, redirect_slashes=False
)
app.add_middleware(GatewayLoggingMiddleware)


def build_url(service, route, request: Request) -> str:
    """
    This function constructs the full URL for an upstream service request.
    It takes the `service` object (containing the base URL) and the `route` object
    (containing the path with potential path parameters) as input.
    It replaces any path parameters in the route with their actual values from the request.
    """
    path = route.path
    for name, value in request.path_params.items():
        path = path.replace(f"{{{name}}}", str(value))
    return f"{service.url}{path}"


async def forward_request(route, url, request: Request, qp, json_body=None):
    """
    This function forwards the incoming request to the appropriate upstream service.
    It handles query parameters, JSON bodies, and relevant headers, including a trace ID.
    Finally, it streams back the response from the upstream service.
    """
    async with httpx.AsyncClient() as client:
        response = await client.request(
            method=route.method.upper(),
            url=url,
            params=qp or {},
            json=json_body,
            follow_redirects=True,
            headers={
                k: v
                for k, v in request.headers.items()
                if k.lower()
                not in ("host", "connection", "content-length", "transfer-encoding")
            },
        )

    return Response(
        content=response.content,
        status_code=response.status_code,
        media_type=response.headers.get("content-type"),
    )


def create_body_handler(service, route, RequestModel, qp_dep):
    """
    This function creates an async handler for routes that expect a request body. (eg. POST / PUT / PATCH).)
    It takes the service, route, RequestModel (for validation), and an optional
    query parameter dependency as input.
    """

    async def handler(
        request: Request,
        raw_body: dict = Body(...),
        qp: dict = Depends(qp_dep) if qp_dep else {},
    ):

        data = RequestModel(**raw_body)

        url = build_url(service, route, request)
        return await forward_request(
            route, url, request, qp, json_body=data.model_dump()
        )

    return handler


def create_param_only_handler(service, route, qp_dep):
    """
    This function creates an async handler for routes that do not expect a request body (e.g., GET, DELETE).
    It takes the service, route, and an optional query parameter dependency as input.
    """

    async def handler(
        request: Request,
        qp: dict = Depends(qp_dep) if qp_dep else {},
    ):
        url = build_url(service, route, request)
        return await forward_request(route, url, request, qp)

    return handler


def make_proxy_handler(service, route):
    """
    This function creates a proxy handler for a given service and route.
    It dynamically generates an async function that takes a FastAPI Request object
    and an optional body (for POST/PUT/PATCH requests).
    It then forwards the request to the upstream service, handling query parameters,
    JSON bodies, and relevant headers, including a trace ID.
    Finally, it streams back the response from the upstream service.
    """

    async def handler(request: Request, body: dict | None = None):

        upstream_url = service.url + request.url.path.replace("/api/v1", "")
        method = route.method.upper()

        is_detail = "{" in route.path  # GET /recipes/{id}

        # --- Query params only for list GET endpoints ---
        params = request.query_params if (method == "GET" and not is_detail) else None

        # --- JSON body only for methods that accept payload ---
        json_body = body if method in ("POST", "PUT", "PATCH") else None

        # --- Forward headers, but strip body-sensitive ones ---
        headers = {
            k: v
            for k, v in request.headers.items()
            if k.lower()
            not in (
                "host",
                "content-length",
                "transfer-encoding",
                "connection",
            )
        }

        trace_id = request.headers.get(TRACE_ID_HEADER) or str(uuid.uuid4())
        headers[TRACE_ID_HEADER] = trace_id

        async with httpx.AsyncClient() as client:
            response = await client.request(
                method=method,
                url=upstream_url,
                params=params,
                json=json_body,
                headers=headers,
            )

        # stream back response cleanly
        return Response(
            content=response.content,
            status_code=response.status_code,
            media_type=response.headers.get("content-type"),
            headers={
                k: v
                for k, v in response.headers.items()
                if k.lower()
                not in ("content-length", "transfer-encoding", "connection")
            },
        )

    handler.__name__ = f"proxy_{service.name}_{route.method}"
    return handler


def register_routes():
    """
    This function iterates through all registered services and their routes
    and dynamically creates API endpoints in the FastAPI application.
    It uses `make_proxy_handler` to create a generic handler that forwards
    requests to the appropriate upstream service.
    It also handles routes that expect a request body by ensuring the
    FastAPI endpoint signature includes the `request_model` for validation.
    """
    for service_name, service in config.services.items():
        for route in service.routes:
            api_route_path = f"{config.urlPrefix}{route.path}"
            log_event(
                "startup",
                name=service_name,
                route=api_route_path,
                action="gateway.register_routes",
                message=f"Registering routes for service: {service_name}",
            )

            endpoint = make_proxy_handler(service, route)
            app.add_api_route(
                path=api_route_path,
                endpoint=endpoint,
                methods=[route.method.upper()],
                response_model=route.response_model,
                name=route.description or route.path,
                tags=route.tags,
            )


@app.on_event("startup")
def startup():
    register_routes()
    print("Gateway routes loaded from contract.")


@app.get("/healthz")
async def health():
    return {"status": "ok"}
