"""Custom Gunicorn worker for the gateway.

Running the gateway as ``gunicorn ... --worker-class uvicorn.workers.UvicornWorker``
causes every response to carry duplicate ``server`` and ``date`` headers: gunicorn
emits its own pair, and the Uvicorn worker emits a second pair (Uvicorn sets
``server: uvicorn`` and ``date`` by default). The frontend nginx then logs a
warning on every proxied request::

    upstream sent duplicate header line: "date: ...", previous value: "date: ..."
    upstream sent duplicate header line: "server: uvicorn", previous value: ...

This worker disables Uvicorn's own ``server`` and ``date`` headers via
``CONFIG_KWARGS`` so gunicorn remains the single source of both, yielding exactly
one of each on every response. Point the deployment at this class with
``--worker-class services.gateway.worker.GatewayUvicornWorker``.
"""

from typing import Any

from uvicorn.workers import UvicornWorker


class GatewayUvicornWorker(UvicornWorker):
    """Uvicorn worker that defers ``server`` and ``date`` headers to gunicorn."""

    CONFIG_KWARGS: dict[str, Any] = {
        **UvicornWorker.CONFIG_KWARGS,
        "server_header": False,
        "date_header": False,
    }
