import importlib
import inspect

from fastapi import Body, Depends, Request

from services.framework.logging import Span
from services.framework.utils import build_query_dependency


async def _run(handler_fn, request, data, db, qp):
    """
    Helper to run a handler function with the correct arguments.
    This is necessary because we support both FastAPI-style dependency injection
    and a more traditional, ordered argument list.
    """
    with Span(handler_fn.__name__):
        args = []

        if data:
            args.append(data)

        for v in request.path_params.values():
            args.append(v)

        if db:
            args.append(db)

        # only for list endpoint with query params
        if qp:
            res = handler_fn(*args, **qp)
        else:
            res = handler_fn(*args)

        return await res if inspect.isawaitable(res) else res


def resolve_handler(handler_path: str):
    """
    Resolve a handler function from a string path, e.g. "services.users.handlers.get_user".
    """
    module_name, func_name = handler_path.rsplit(".", 1)
    module = importlib.import_module(module_name)
    return getattr(module, func_name)


def build_body_handler(request_model, handler_fn, get_db, qp_dep):
    """
    Helper to build an endpoint for routes that expect a request body.
    This handles the FastAPI dependency injection for the request body,
    and then calls the actual handler function with the correct arguments.
    """

    async def endpoint(
        data: request_model = Body(..., embed=False),
        request: Request = None,
        db=Depends(get_db) if get_db else None,
    ):

        args = list(request.path_params.values())
        args.append(data)
        if db is not None:
            args.append(db)

        result = handler_fn(*args)
        if inspect.isawaitable(result):
            return await result
        return result

    return endpoint


def build_query_handler(handler_fn, get_db, qp_dep):
    """
    Helper to build an endpoint for routes that do not expect a request body.
    This handles the FastAPI dependency injection for the query parameters,
    and then calls the actual handler function with the correct arguments.
    """

    async def endpoint(
        request: Request,
        db=Depends(get_db) if get_db else None,
        qp: dict = Depends(qp_dep) if qp_dep else {},
    ):
        return await _run(handler_fn, request, None, db, qp)

    return endpoint


def bind_arguments(request, data, db, handler_fn, qp):
    """
    Helper to bind arguments to a handler function.
    This is necessary because we support both FastAPI-style dependency injection
    and a more traditional, ordered argument list.
    """
    args = []

    # Body for POST/PATCH only
    if data is not None:
        args.append(data)

    # Path params always
    for value in request.path_params.values():
        args.append(value)

    # DB session
    if db:
        args.append(db)

    # Decide whether to forward qp
    # If handler expects a body → DO NOT pass qp
    # If no body → qp ARE forwarded to handler
    if data is None and qp:
        return handler_fn(*args, **qp)

    return handler_fn(*args)


def make_endpoint(route, handler_fn, get_db=None):
    """
    Helper to build an endpoint for a given route.
    This handles the FastAPI dependency injection for both body and query parameters,
    and then calls the actual handler function with the correct arguments.
    """
    request_model = route.request_model
    qp_dep = build_query_dependency(route) if "{" not in route.path else None

    if request_model:
        return build_body_handler(request_model, handler_fn, get_db, qp_dep)

    return build_query_handler(handler_fn, get_db, qp_dep)
