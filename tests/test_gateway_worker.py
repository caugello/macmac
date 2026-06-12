"""Tests for the gateway's custom Gunicorn worker (issue #215).

The gateway runs under ``gunicorn`` with a Uvicorn worker. By default both
gunicorn and Uvicorn emit ``server`` and ``date`` response headers, so every
response carries duplicates and the frontend nginx logs a warning on each
proxied request. ``GatewayUvicornWorker`` disables Uvicorn's own ``server`` and
``date`` headers so gunicorn remains the single source of both.
"""

import pytest
import uvicorn
from uvicorn.workers import UvicornWorker

from services.gateway.worker import GatewayUvicornWorker


@pytest.mark.unit
def test_worker_disables_uvicorn_server_and_date_headers():
    """CONFIG_KWARGS must turn off Uvicorn's server/date header emission."""
    assert GatewayUvicornWorker.CONFIG_KWARGS["server_header"] is False
    assert GatewayUvicornWorker.CONFIG_KWARGS["date_header"] is False


@pytest.mark.unit
def test_worker_preserves_base_config_kwargs():
    """The override must not drop the base UvicornWorker defaults."""
    for key, value in UvicornWorker.CONFIG_KWARGS.items():
        assert GatewayUvicornWorker.CONFIG_KWARGS[key] == value


@pytest.mark.unit
def test_uvicorn_config_honors_disabled_headers():
    """A uvicorn Config built from the kwargs reports both headers disabled."""
    config = uvicorn.Config(
        app=None,
        server_header=GatewayUvicornWorker.CONFIG_KWARGS["server_header"],
        date_header=GatewayUvicornWorker.CONFIG_KWARGS["date_header"],
    )
    assert config.server_header is False
    assert config.date_header is False


@pytest.mark.unit
def test_worker_subclasses_uvicorn_worker():
    """It must remain a UvicornWorker so gunicorn drives an ASGI app."""
    assert issubclass(GatewayUvicornWorker, UvicornWorker)
