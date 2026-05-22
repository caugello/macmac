# MacMac

Personal meal planning and grocery catalog platform. Configuration-driven microservices with Python, FastAPI, and PostgreSQL.

[![Tests](https://img.shields.io/badge/tests-98%20passing-success)]()
[![Coverage](https://img.shields.io/badge/coverage-84%25-success)]()
[![Python](https://img.shields.io/badge/python-3.11%2B-blue)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104%2B-009688)]()

## Running

```bash
podman-compose -f podman-compose-dev.yaml up
```

Services: Gateway (:8000), Recipes (:8001), Catalog (:8002), Meal Plans (:8003), Auth (:8004)

## Development

```bash
make help          # all available commands
make test-unit     # run tests
make lint          # run linters
make format        # format code
make sbom          # scan dependencies for vulnerabilities
```

## Architecture

Configuration-driven microservices — routes, schemas, and handlers defined in `config.yaml`, dynamically loaded by the framework. Each service has its own PostgreSQL database, Redis caching, and isolated container network.
