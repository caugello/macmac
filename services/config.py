import importlib
import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import yaml


@dataclass
class QueryParam:
    """
    Represents a query parameter for a route.
    """

    type: str  # "int", "str", etc. (string name, we’ll eval it later)
    default: Any = None
    ge: Optional[float] = None
    le: Optional[float] = None
    example: Any = None


@dataclass
class Route:
    """
    Represents a route in the service.
    """

    method: str
    path: str
    request_model: Optional[Any]
    response_model: Optional[Any]
    handler: str
    query_params: Dict[str, QueryParam]
    description: Optional[str]
    tags: List[str]


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
class Service:
    """
    Represents a service with its configuration, including routes and database.
    """

    name: str
    version: str
    title: str
    url: str
    db: Optional[str]
    routes: List[Route]
    dependencies: Optional[List[Dependency]]


@dataclass
class Vendor:
    """
    Represents a vendor with its configuration.
    """

    name: str
    url: str
    product_url_identifier: Optional[str]


@dataclass
class Config:
    """
    Represents the entire configuration of the application, including all services.
    """

    urlPrefix: str
    tempDir: Optional[str]
    title: str
    version: str
    services: dict[str, Service]
    vendors: dict[str, Vendor]


def load_model(ref: Optional[str]):
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
        return List[cls]

    return cls


def load_handler(ref: str):
    """
    Loads a handler function from a string reference.
    """
    module_name, func_name = ref.rsplit(".", 1)
    module = importlib.import_module(module_name)
    return getattr(module, func_name)


def parse_query_params(data: Optional[dict]) -> Dict[str, QueryParam]:
    """
    Parses a dictionary of query parameter configurations into a dictionary of QueryParam objects.
    """
    if not data:
        return {}
    params: Dict[str, QueryParam] = {}
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
        dependencies=[
            parse_dependency(dep) for dep in service_data.get("dependencies", [])
        ],
        routes=[parse_route(route) for route in service_data.get("routes", [])],
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


def get_config_for_service(name: str) -> Service:
    """
    Retrieves the configuration for a specific service by its name.
    """
    svc = get_config().services.get(name)
    if svc:
        return svc
    raise ValueError(f"Service with name {name} not found.")


def get_config_for_service_dependency(
    service_name: str, dependency_name: str
) -> Dependency:
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


def get_config() -> Config:
    """
    Loads and parses the entire application configuration from the config.yaml file.
    """
    BASE_DIR = os.path.dirname(os.path.dirname(__file__))
    # TODO: make config yaml path customizable
    config_file = os.path.join(BASE_DIR, "config.yaml")
    with open(config_file, "r") as f:
        raw_config = yaml.safe_load(f)

    services = {
        name: parse_service({"name": name, **data})
        for name, data in raw_config["services"].items()
    }

    vendors = {
        name: parse_vendor({"name": name, **data})
        for name, data in raw_config["vendors"].items()
    }

    config = Config(
        urlPrefix=raw_config["urlPrefix"],
        title=raw_config["title"],
        version=raw_config["version"],
        tempDir=raw_config.get("tempDir"),
        services=services,
        vendors=vendors,
    )
    return config
