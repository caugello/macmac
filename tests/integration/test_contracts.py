"""Contract tests verifying config.yaml stays in sync with the framework.

These tests are pure Python with zero external dependencies (no Postgres, no
Redis). They guard against the "silently-dropped-param" bug class: a route in
config.yaml declares a ``query_params`` entry that ``build_query_dependency()``
does not actually know how to extract, so the value is silently dropped at
request time (the v0.2.1 is_food / start_date / end_date / ingredient bugs).
"""

import inspect

import pytest

from services.config import get_config
from services.framework.utils import build_query_dependency


def _supported_query_params() -> set[str]:
    """Return the query params ``build_query_dependency()`` can actually extract.

    ``build_query_dependency()`` returns an inner ``query_dep`` function whose
    signature enumerates every query param the framework supports. We build it
    with a route that declares all params so none are filtered out, then read
    the inner function's signature.
    """

    class _AllParamsRoute:
        # Truthy, non-empty mapping so the dependency keeps every param.
        query_params = {"__all__": {}}

    query_dep = build_query_dependency(_AllParamsRoute())
    return set(inspect.signature(query_dep).parameters)


def _declared_query_params() -> dict[str, set[str]]:
    """Return ``{route_id: {param, ...}}`` for every route declaring params."""
    config = get_config()
    declared: dict[str, set[str]] = {}
    for service in config.services.values():
        for route in service.routes:
            if route.query_params:
                route_id = f"{route.method.upper()} {route.path}"
                declared[route_id] = set(route.query_params)
    return declared


@pytest.mark.integration
def test_config_query_params_have_framework_parity():
    """Every query_param in config.yaml must be extractable by the framework.

    Fails loudly (naming the offending route and param) if config.yaml declares
    a query param that ``build_query_dependency()`` cannot extract.
    """
    supported = _supported_query_params()
    declared = _declared_query_params()

    # The config must declare at least one route with query params, otherwise
    # this test would pass vacuously and silently stop guarding anything.
    assert declared, "No routes with query_params found in config.yaml"

    missing = {
        route_name: sorted(params - supported)
        for route_name, params in declared.items()
        if params - supported
    }

    assert not missing, (
        "config.yaml declares query_params that build_query_dependency() "
        f"cannot extract (they would be silently dropped): {missing}. "
        f"Framework supports: {sorted(supported)}."
    )
