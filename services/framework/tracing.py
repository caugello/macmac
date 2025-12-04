import contextvars
import time
import uuid

from services.framework.logging import Span, current_trace_id, log_span

TRACE_ID_HEADER = "X-Trace-ID"


def start_request_trace(request):
    """
    Start a new trace for an incoming request.
    """
    # ID must come from gateway
    trace_id = request.headers.get(TRACE_ID_HEADER)
    if not trace_id:
        # fallback only if service is called directly, bypassing gateway
        trace_id = "LOCAL-" + str(uuid.uuid4())

    current_trace_id.set(trace_id)
    return trace_id


async def tracing_middleware(request, call_next):
    """
    Middleware that starts a trace for an incoming request and logs a span for the request.
    """
    trace_id = start_request_trace(request)
    start = time.time()

    response = await call_next(request)

    duration = round((time.time() - start) * 1000, 2)
    log_span(
        "request",
        method=request.method,
        path=request.url.path,
        status=response.status_code,
        duration_ms=duration,
    )

    response.headers[TRACE_ID_HEADER] = trace_id
    return response


def traced(fn):
    """
    Decorator to trace a function call.
    Creates a new span for the function call.
    """

    async def wrapper(*args, **kwargs):
        with Span(fn.__name__):
            return await fn(*args, **kwargs)

    return wrapper
