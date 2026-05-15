# MacMac

A configuration-driven microservices platform for managing recipes and product catalogs with intelligent product enrichment.

[![Tests](https://img.shields.io/badge/tests-98%20passing-success)]()
[![Coverage](https://img.shields.io/badge/coverage-84%25-success)]()
[![Python](https://img.shields.io/badge/python-3.11%2B-blue)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104%2B-009688)]()

## Overview

MacMac is a modern microservices architecture built with Python, FastAPI, and PostgreSQL. The entire system is **configuration-driven** - services, routes, and handlers are defined in `config.yaml` and dynamically loaded at runtime, eliminating boilerplate code and enabling rapid API development.

### Key Features

- ✨ **Configuration-Driven Architecture** - Define services and routes in YAML
- 🚀 **Microservices Design** - Gateway, Recipes, Catalog, and Meal Plans services
- ⚡ **Redis Caching** - 90% latency reduction, 7-10x throughput increase
- 🤖 **Automatic Product Enrichment** - Rule-based extraction of product metadata
- 📨 **Message Queue Integration** - RabbitMQ for async processing
- 🗄️ **Database Migrations** - Alembic for schema versioning
- ✅ **Comprehensive Testing** - 84% code coverage with 98 unit tests
- 🔄 **CI/CD Ready** - GitHub Actions workflows for testing and deployment

## Architecture

### Services

#### 1. Gateway Service
**Port:** 8000 | **Purpose:** API gateway and request router

- Proxies requests to backend services
- Adds distributed tracing with trace IDs
- Exposes all services under `/api/v1` prefix

#### 2. Recipes Service
**Port:** 8001 | **Purpose:** Recipe management API

- CRUD operations for recipes
- PostgreSQL database with Alembic migrations
- Search, filter, and sort capabilities
- Normalized title indexing for uniqueness

#### 3. Catalog Service
**Port:** 8002 | **Purpose:** Product catalog management

- CRUD operations for grocery products
- PostgreSQL database with Alembic migrations
- Background workers for product enrichment

##### Catalog Workers

**Crawler** (`services/catalog/crawler/main.py`)
- Fetches products from vendor sitemaps
- Publishes to RabbitMQ queue for processing

**Enricher** (`services/catalog/enricher/main.py`)
- Consumes products from RabbitMQ
- Extracts metadata using **rule-based algorithms** (no AI/LLM required):
  - Brand detection (Boni Selection, Delhaize, Carrefour, etc.)
  - Canonical name extraction
  - Quantity parsing (g, kg, ml, l)
  - Food classification (60+ keywords in FR/NL/EN)
- Writes enriched data to database

### Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | FastAPI |
| Language | Python 3.11+ |
| Databases | PostgreSQL 16+ |
| Caching | Redis 7+ |
| Message Queue | RabbitMQ 4.1+ |
| Migrations | Alembic |
| Containers | Podman/Docker |
| Testing | pytest, pytest-cov |
| Linting | ruff, black, mypy |
| CI/CD | GitHub Actions |

## Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL 16+
- Redis 7+
- RabbitMQ 4.1+
- Podman or Docker

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd macmac

# Install dependencies
make install
```

### Running Services

#### Development Mode (Recommended)

```bash
# Start all services with exposed ports
podman-compose -f podman-compose-dev.yaml up

# Services available at:
# - Gateway:  http://localhost:8000
# - Recipes:  http://localhost:8001
# - Catalog:  http://localhost:8002
# - RabbitMQ: http://localhost:15672 (guest/guest)
# - Redis:    localhost:6379
```

#### Production Mode

```bash
# Start all services (internal network only)
podman-compose up
```

#### Individual Services

```bash
# Gateway
uvicorn services.gateway.main:app --reload --port 8000

# Recipes API
uvicorn services.recipes.main:app --reload --port 8001

# Catalog API
uvicorn services.catalog.main:app --reload --port 8002

# Background Workers
python -m services.catalog.crawler.main    # Crawler
python -m services.catalog.enricher.main   # Enricher
```

### Database Setup

```bash
# Apply migrations
alembic -c services/recipes/alembic.ini upgrade head
alembic -c services/catalog/alembic.ini upgrade head

# Create new migration
alembic -c services/recipes/alembic.ini revision --autogenerate -m "description"
```

## Development

### Available Commands

```bash
make help              # Show all available commands
make install           # Install dependencies
make test-unit         # Run unit tests
make test-cov          # Run tests with coverage report
make test-integration  # Run integration tests
make lint              # Run all linters
make format            # Format code with black
make clean             # Remove generated files
```

### Testing

```bash
# Run all unit tests
make test-unit

# Run with coverage HTML report
make test-cov

# Run specific test file
pytest tests/test_catalog_crud.py -v

# Run tests matching pattern
pytest tests/ -k "catalog" -v
```

### Linting and Formatting

```bash
# Run all linters
make lint

# Format code
make format

# Individual tools
ruff check services/ tests/
black services/ tests/
mypy services/ --ignore-missing-imports
```

### Code Quality Metrics

- **Test Coverage:** 84% overall
- **Tests:** 98 passing, 1 skipped
- **Critical Modules:** 90%+ coverage
  - `services/catalog/crud.py` - 100%
  - `services/catalog/enricher/main.py` - 93%
  - `services/recipes/crud.py` - 98%
  - `services/config.py` - 100%
  - `services/framework/*` - 96%+
  - `services/shared/lib/messaging_bus.py` - 100%

## API Documentation

### Recipes API

**Create Recipe**
```http
POST /api/v1/recipes
Content-Type: application/json

{
  "title": "Chocolate Cake",
  "description": "Delicious chocolate cake",
  "ingredients": [
    {"name": "flour", "qty": 2.0, "unit": "kg"},
    {"name": "sugar", "qty": 1.0, "unit": "kg"}
  ],
  "steps": ["Mix ingredients", "Bake at 180°C for 30 minutes"]
}
```

**List Recipes**
```http
GET /api/v1/recipes?limit=10&offset=0&search=chocolate&sort=title:asc
```

**Get, Update, Delete Recipe**
```http
GET /api/v1/recipes/{recipe_id}
PATCH /api/v1/recipes/{recipe_id}
DELETE /api/v1/recipes/{recipe_id}
```

### Catalog API

**Create Catalog Item**
```http
POST /api/v1/catalog
Content-Type: application/json

{
  "vendor_name": "Colruyt",
  "raw_name": "boni selection pizza margherita 400g",
  "product_url": "https://example.com/products/pizza",
  "is_food": true
}
```

**List Catalog Items**
```http
GET /api/v1/catalog?limit=10&offset=0&search=pizza&sort=raw_name:asc
```

**Get Catalog Item**
```http
GET /api/v1/catalog/{item_id}
```

### Interactive Documentation

OpenAPI/Swagger documentation:
- **Recipes:** http://localhost:8001/docs
- **Catalog:** http://localhost:8002/docs
- **Gateway:** http://localhost:8000/docs

## Adding New Features

### Adding a New Route

1. **Define Schema** in `services/shared/schemas/`
```python
class ItemCreate(BaseModel):
    name: str
    price: float
```

2. **Implement Handler** in `services/<service>/crud.py`
```python
async def create_item(data: ItemCreate, db: Session):
    item = Item(**data.model_dump())
    db.add(item)
    db.commit()
    return ItemOut.model_validate(item)
```

3. **Register in config.yaml**
```yaml
routes:
  - name: create_item
    method: post
    path: /items
    request_model: services.shared.schemas.item.ItemCreate
    response_model: services.shared.schemas.item.ItemOut
    handler: services.myservice.crud.create_item
    tags: [items]
```

4. **Restart** - Routes are automatically registered!

### Adding a New Service

1. Create directory: `services/myservice/`
2. Add files: `main.py`, `crud.py`, `models.py`, `db.py`
3. Configure in `config.yaml`
4. Add to `podman-compose.yaml`

See `CLAUDE.md` for detailed architecture documentation.

## Configuration

### Service Configuration (config.yaml)

```yaml
services:
  recipes:
    name: recipes
    url: "http://0.0.0.0:8001"
    db: "postgresql+psycopg2://dbuser:dbpass@0.0.0.0:5432/recipes"
    routes: [...]
```

### Service URLs

- **Recipes Database:** `postgresql://dbuser:dbpass@localhost:5432/recipes`
- **Catalog Database:** `postgresql://dbuser:dbpass@localhost:5433/catalog`
- **Meal Plans Database:** `postgresql://dbuser:dbpass@localhost:5434/meal_plans`
- **Redis Cache:** `redis://localhost:6379/0`
- **RabbitMQ:** `amqp://guest:guest@localhost:5672/`

### Network Architecture

Isolated networks enforce service boundaries:
- `macmac_gateway` - Gateway ↔ APIs
- `macmac_recipes` - Recipes API ↔ DB
- `macmac_catalog` - Catalog API ↔ DB ↔ RabbitMQ
- `macmac_meal_plans` - Meal Plans API ↔ DB
- `macmac_cache` - All services ↔ Redis

This prevents direct database access and isolates cache traffic.

## CI/CD

### GitHub Actions Workflows

**Build and Push** (`.github/workflows/build-and-push.yaml`)
```
Push to main → Lint → Unit Tests → Build Image → Push to Quay.io
```

**Test and Lint** (`.github/workflows/test.yaml`)
```
PR/Push → Lint (ruff, black, mypy)
       → Unit Tests (coverage report)
       → Integration Tests (PostgreSQL + RabbitMQ)
```

### Container Registry

Images: `quay.io/caugello/macmac-base`

## Project Structure

```
macmac/
├── .github/workflows/      # CI/CD pipelines
├── services/
│   ├── gateway/            # API Gateway
│   ├── recipes/            # Recipe service
│   │   ├── alembic/        # Migrations
│   │   ├── crud.py         # CRUD ops
│   │   ├── models.py       # DB models
│   │   └── main.py         # FastAPI app
│   ├── catalog/            # Catalog service
│   │   ├── crawler/        # Product crawler
│   │   ├── enricher/       # Product enricher (rule-based)
│   │   └── ...
│   ├── framework/          # Core framework
│   └── shared/             # Shared utilities
├── tests/                  # 98 unit tests
├── config.yaml             # Service config
├── Containerfile           # Image definition
├── Makefile                # Dev commands
└── CLAUDE.md               # Architecture docs
```

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Apply migrations
alembic -c services/recipes/alembic.ini upgrade head
```

### RabbitMQ Connection Issues
```bash
# Check RabbitMQ is running
curl http://localhost:15672

# View management UI
open http://localhost:15672  # guest/guest
```

### Redis Connection Issues
```bash
# Check Redis is running
podman exec -it macmac-redis-1 redis-cli ping

# Clear cache if stale
podman exec -it macmac-redis-1 redis-cli FLUSHDB

# View cache stats
podman exec -it macmac-redis-1 redis-cli INFO stats
```

### Import Errors
```bash
# Ensure in project root
cd /path/to/macmac

# Check Python path
python -c "import sys; print(sys.path)"
```

### Port Conflicts
```bash
# Check ports in use
lsof -i :8000
lsof -i :8001
lsof -i :5432

# Modify ports in podman-compose-dev.yaml if needed
```

## Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Write tests for new functionality
3. Run tests: `make test-unit`
4. Check linting: `make lint`
5. Format code: `make format`
6. Commit with descriptive message
7. Create pull request

### Code Standards

- ✅ **Test Coverage:** Maintain 80%+ for new code
- ✅ **Linting:** Pass ruff and black checks
- ✅ **Type Hints:** Use for all function signatures
- ✅ **Documentation:** Add docstrings for public APIs

## Performance

### API Response Times

| Operation | Without Cache | With Cache (Hit) | Improvement |
|-----------|---------------|------------------|-------------|
| GET /recipes/{id} | 45ms | 5ms | 90% faster |
| GET /recipes (list) | 180ms | 12ms | 93% faster |
| GET /catalog/{id} | 38ms | 4ms | 89% faster |
| Throughput | 200 req/s | 1500+ req/s | 7.5x increase |

**Cache Hit Rates**: 75-95% depending on access patterns

See [docs/REDIS_CACHING.md](docs/REDIS_CACHING.md) for detailed performance metrics and [docs/CACHE_QUICK_START.md](docs/CACHE_QUICK_START.md) for setup guide.

### Product Enrichment

- **Enricher Throughput:** ~100 items/second (rule-based)
- **Processing Time:** <10ms per item (vs 2-5s with LLM)
- **Zero External Dependencies:** No AI API calls required
- **Cost:** $0 per item (rule-based extraction)

## License

[Add your license information here]

## Contact

[Add contact information here]

---

Built with ❤️ using FastAPI, PostgreSQL, and RabbitMQ
