import importlib
import os
from dataclasses import dataclass
from typing import Any

import yaml


@dataclass
class QueryParam:
    """
    Represents a query parameter for a route.
    """

    type: str  # "int", "str", etc. (string name, we’ll eval it later)
    default: Any = None
    ge: float | None = None
    le: float | None = None
    example: Any = None


@dataclass
class Route:
    """
    Represents a route in the service.
    """

    method: str
    path: str
    request_model: Any | None
    response_model: Any | None
    handler: str
    query_params: dict[str, QueryParam]
    description: str | None
    tags: list[str]


@dataclass
class Dependency:
    """
    Represents a dependency with its configuration.
    """

    name: str
    title: str
    version: str
    url: str


@dataclass
class EnricherConfig:
    """
    Represents enricher configuration for catalog service.
    """

    batch_size: int
    delay_between_requests: int
    page_timeout: int
    batch_pause: int
    openai_model: str
    max_retries: int = 3
    retry_backoff: float = 2.0


@dataclass
class JwtConfig:
    """
    Represents JWT configuration.
    """

    algorithm: str
    access_token_expire_minutes: int


@dataclass
class FirebaseConfig:
    """
    Represents Firebase configuration.
    """

    project_id: str


@dataclass
class AuthConfig:
    """
    Represents authentication configuration.
    """

    jwt: JwtConfig
    firebase: FirebaseConfig


@dataclass
class CacheTTL:
    """
    Represents cache TTL configuration for different data types.
    """

    recipes_list: int
    recipes_detail: int
    catalog_list: int
    catalog_detail: int
    meal_plans_list: int
    meal_plans_detail: int


@dataclass
class CacheConfig:
    """
    Represents Redis cache configuration.
    """

    host: str
    port: int
    db: int
    socket_timeout: int
    socket_connect_timeout: int
    ttl: CacheTTL


@dataclass
class RateLimitEndpoint:
    """
    Represents rate limit configuration for a specific endpoint.
    """

    calls: int
    period: int


@dataclass
class RateLimitConfig:
    """
    Represents rate limiting configuration.
    """

    enabled: bool
    default: RateLimitEndpoint
    endpoints: dict[str, RateLimitEndpoint]


@dataclass
class CorsConfig:
    """
    Represents CORS configuration.
    """

    allowed_origins: list[str]
    allow_credentials: bool
    allow_methods: list[str]
    allow_headers: list[str]
    max_age: int


@dataclass
class GatewayConfig:
    """
    Represents gateway configuration.
    """

    cors: CorsConfig


@dataclass
class Service:
    """
    Represents a service with its configuration, including routes and database.
    """

    name: str
    version: str
    title: str
    url: str
    db: str | None
    routes: list[Route]
    dependencies: list[Dependency] | None
    enricher: EnricherConfig | None = None


@dataclass
class Vendor:
    """
    Represents a vendor with its configuration.
    """

    name: str
    url: str
    product_url_identifier: str | None


@dataclass
class Config:
    """
    Represents the entire configuration of the application, including all services.
    """

    urlPrefix: str
    tempDir: str | None
    title: str
    version: str
    services: dict[str, Service]
    vendors: dict[str, Vendor]
    auth: AuthConfig
    cache: CacheConfig
    rate_limiting: RateLimitConfig
    gateway: GatewayConfig


def load_model(ref: str | None):
    """
    Loads a model class from a string reference.
    Handles optional `List` types by checking for `[]` suffix.
    """
    if not ref:
        return None

    is_list = ref.endswith("[]")
    if is_list:
        ref = ref[:-2]

    module_name, class_name = ref.rsplit(".", 1)
    module = importlib.import_module(module_name)
    cls = getattr(module, class_name)

    if is_list:
        return list[cls]

    return cls


def load_handler(ref: str):
    """
    Loads a handler function from a string reference.
    """
    module_name, func_name = ref.rsplit(".", 1)
    module = importlib.import_module(module_name)
    return getattr(module, func_name)


def parse_query_params(data: dict | None) -> dict[str, QueryParam]:
    """
    Parses a dictionary of query parameter configurations into a dictionary of QueryParam objects.
    """
    if not data:
        return {}
    params: dict[str, QueryParam] = {}
    for name, cfg in data.items():
        params[name] = QueryParam(
            type=cfg.get("type", "str"),
            default=cfg.get("default"),
            ge=cfg.get("ge"),
            le=cfg.get("le"),
            example=cfg.get("example"),
        )
    return params


def parse_route(route_data: dict) -> Route:
    """
    Parses a dictionary of route configurations into a Route object.
    """
    return Route(
        method=route_data["method"],
        path=route_data["path"],
        request_model=load_model(route_data.get("request_model")),
        response_model=load_model(route_data.get("response_model")),
        handler=route_data["handler"],
        description=route_data.get("description"),
        tags=route_data.get("tags", []),
        query_params=parse_query_params(route_data.get("query_params")),
    )


def parse_dependency(dependencies_data: dict) -> Dependency:
    """
    Parses a dictionary of dependency configurations into a Dependency object.
    """
    return Dependency(
        name=dependencies_data["name"],
        title=dependencies_data["title"],
        version=dependencies_data["version"],
        url=dependencies_data["url"],
    )


def parse_enricher(enricher_data: dict | None) -> EnricherConfig | None:
    """
    Parses enricher configuration into an EnricherConfig object.
    """
    if not enricher_data:
        return None
    return EnricherConfig(
        batch_size=enricher_data["batch_size"],
        delay_between_requests=enricher_data["delay_between_requests"],
        page_timeout=enricher_data["page_timeout"],
        batch_pause=enricher_data["batch_pause"],
        openai_model=enricher_data["openai_model"],
        max_retries=enricher_data.get("max_retries", 3),
        retry_backoff=enricher_data.get("retry_backoff", 2.0),
    )


def parse_service(service_data: dict) -> Service:
    """
    Parses a dictionary of service configurations into a Service object.
    """
    return Service(
        name=service_data["name"],
        title=service_data["title"],
        version=service_data["version"],
        url=service_data["url"],
        db=service_data.get("db"),
        dependencies=[parse_dependency(dep) for dep in service_data.get("dependencies", [])],
        routes=[parse_route(route) for route in service_data.get("routes", [])],
        enricher=parse_enricher(service_data.get("enricher")),
    )


def parse_vendor(vendor_data: dict) -> Vendor:
    """
    Parses a dictionary of vendor configurations into a Vendor object.
    """
    return Vendor(
        name=vendor_data["name"],
        url=vendor_data["url"],
        product_url_identifier=vendor_data["product_url_identifier"],
    )


def parse_auth_config(auth_data: dict) -> AuthConfig:
    """
    Parses authentication configuration.
    """
    return AuthConfig(
        jwt=JwtConfig(
            algorithm=auth_data["jwt"]["algorithm"],
            access_token_expire_minutes=auth_data["jwt"]["access_token_expire_minutes"],
        ),
        firebase=FirebaseConfig(
            project_id=auth_data["firebase"]["project_id"],
        ),
    )


def parse_cache_config(cache_data: dict) -> CacheConfig:
    """
    Parses cache configuration.
    """
    return CacheConfig(
        host=cache_data["host"],
        port=cache_data["port"],
        db=cache_data["db"],
        socket_timeout=cache_data["socket_timeout"],
        socket_connect_timeout=cache_data["socket_connect_timeout"],
        ttl=CacheTTL(
            recipes_list=cache_data["ttl"]["recipes_list"],
            recipes_detail=cache_data["ttl"]["recipes_detail"],
            catalog_list=cache_data["ttl"]["catalog_list"],
            catalog_detail=cache_data["ttl"]["catalog_detail"],
            meal_plans_list=cache_data["ttl"]["meal_plans_list"],
            meal_plans_detail=cache_data["ttl"]["meal_plans_detail"],
        ),
    )


def parse_rate_limit_config(rate_limit_data: dict) -> RateLimitConfig:
    """
    Parses rate limiting configuration.
    """
    endpoints = {}
    for path, config in rate_limit_data.get("endpoints", {}).items():
        endpoints[path] = RateLimitEndpoint(
            calls=config["calls"],
            period=config["period"],
        )

    return RateLimitConfig(
        enabled=rate_limit_data["enabled"],
        default=RateLimitEndpoint(
            calls=rate_limit_data["default"]["calls"],
            period=rate_limit_data["default"]["period"],
        ),
        endpoints=endpoints,
    )


def parse_gateway_config(gateway_data: dict) -> GatewayConfig:
    """
    Parses gateway configuration.
    """
    return GatewayConfig(
        cors=CorsConfig(
            allowed_origins=gateway_data["cors"]["allowed_origins"],
            allow_credentials=gateway_data["cors"]["allow_credentials"],
            allow_methods=gateway_data["cors"]["allow_methods"],
            allow_headers=gateway_data["cors"]["allow_headers"],
            max_age=gateway_data["cors"]["max_age"],
        ),
    )


def get_config_for_service(name: str) -> Service:
    """
    Retrieves the configuration for a specific service by its name.
    """
    svc = get_config().services.get(name)
    if svc:
        return svc
    raise ValueError(f"Service with name {name} not found.")


def get_config_for_service_dependency(service_name: str, dependency_name: str) -> Dependency:
    """
    Retrieves the configuration for a specific dependency of a service.
    """
    svc = get_config_for_service(service_name)
    for dep in svc.dependencies or []:
        if dep.name == dependency_name:
            return dep
    raise ValueError(
        f"Dependency with name {dependency_name} not found for service {service_name}."
    )


def get_config_for_vendor(vendor_name: str) -> Vendor:
    """
    Retrieves the configuration for a specific vendor by its name.
    """
    vendor = get_config().vendors.get(vendor_name)
    if vendor:
        return vendor
    raise ValueError(f"Vendor with name {vendor_name} not found.")


_config_cache: Config | None = None


def get_config() -> Config:
    """
    Loads and parses the entire application configuration from the config.yaml file.
    Results are cached after the first call.
    """
    global _config_cache
    if _config_cache is not None:
        return _config_cache

    BASE_DIR = os.path.dirname(os.path.dirname(__file__))
    config_file = os.path.join(BASE_DIR, "config.yaml")
    with open(config_file) as f:
        raw_config = yaml.safe_load(f)

    services = {
        name: parse_service({"name": name, **data}) for name, data in raw_config["services"].items()
    }

    vendors = {
        name: parse_vendor({"name": name, **data}) for name, data in raw_config["vendors"].items()
    }

    _config_cache = Config(
        urlPrefix=raw_config["urlPrefix"],
        title=raw_config["title"],
        version=raw_config["version"],
        tempDir=raw_config.get("tempDir"),
        services=services,
        vendors=vendors,
        auth=parse_auth_config(raw_config["auth"]),
        cache=parse_cache_config(raw_config["cache"]),
        rate_limiting=parse_rate_limit_config(raw_config["rate_limiting"]),
        gateway=parse_gateway_config(raw_config["gateway"]),
    )
    return _config_cache


def reset_config_cache() -> None:
    """Resets the config cache. Intended for testing only."""
    global _config_cache
    _config_cache = None
