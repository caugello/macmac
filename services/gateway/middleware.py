import time

from starlette.middleware.base import BaseHTTPMiddleware

from services.framework.logging import log_event
from services.framework.tracing import TRACE_ID_HEADER


class GatewayLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for logging gateway requests.
    """

    async def dispatch(self, request, call_next):
        start = time.time()

        response = await call_next(request)

        trace_id = response.headers.get(TRACE_ID_HEADER, "-")
        duration = round((time.time() - start) * 1000, 2)
        status = response.status_code

        log_event(
            "gateway_request",
            trace_id=trace_id,
            duration=duration,
            status=status,
            method=request.method,
            path=request.url.path,
        )

        return response
