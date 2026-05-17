.PHONY: help test test-unit test-integration lint format clean install crawl \
	frontend-install frontend-test frontend-lint frontend-format frontend-build

help:
	@echo "MacMac Development Commands"
	@echo ""
	@echo "Backend:"
	@echo "  make install          Install Python dependencies"
	@echo "  make test             Run all Python unit tests"
	@echo "  make test-unit        Run Python unit tests only"
	@echo "  make test-cov         Run Python unit tests with coverage (matches CI)"
	@echo "  make test-integration Run Python integration tests only"
	@echo "  make lint             Run Python linters (ruff, black check, mypy)"
	@echo "  make format           Format Python code with black"
	@echo ""
	@echo "Frontend:"
	@echo "  make frontend-install Install frontend dependencies"
	@echo "  make frontend-test    Run frontend tests with coverage (matches CI)"
	@echo "  make frontend-lint    Run frontend linters (ESLint, Prettier, TypeScript)"
	@echo "  make frontend-format  Format frontend code (Prettier)"
	@echo "  make frontend-build   Build frontend for production"
	@echo ""
	@echo "All:"
	@echo "  make test-all         Run all tests (backend + frontend)"
	@echo "  make lint-all         Run all linters (backend + frontend)"
	@echo "  make format-all       Format all code (backend + frontend)"
	@echo "  make clean            Remove generated files"
	@echo "  make crawl            Run the catalog crawler (manual trigger)"
	@echo ""

install:
	pip install -r requirements.txt

test:
	pytest tests/ -v

test-unit:
	pytest tests/ -m unit -v

test-integration:
	pytest tests/ -m integration -v

test-cov:
	pytest tests/ -m unit --cov=services --cov-report=xml --cov-report=term

lint:
	@echo "Running ruff..."
	ruff check services/ tests/
	@echo ""
	@echo "Running black check..."
	black --check services/ tests/
	@echo ""
	@echo "Running mypy (advisory)..."
	mypy services/ --ignore-missing-imports || true

format:
	black services/ tests/
	ruff check --fix services/ tests/

clean:
	rm -rf .pytest_cache
	rm -rf htmlcov
	rm -rf .coverage
	rm -rf coverage.xml
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	cd frontend && rm -rf node_modules dist coverage .vite 2>/dev/null || true

# Crawler (manually triggered)
crawl:
	podman-compose -f podman-compose-dev.yaml --profile manual run --rm --no-deps catalog_crawler

# Frontend commands
frontend-install:
	cd frontend && npm install

frontend-test:
	cd frontend && npm run test:ci

frontend-test-ui:
	cd frontend && npm run test:ui

frontend-test-coverage:
	cd frontend && npm run test:coverage

frontend-lint:
	cd frontend && npm run lint
	cd frontend && npm run format:check
	cd frontend && npm run type-check

frontend-lint-fix:
	cd frontend && npm run lint:fix

frontend-format:
	cd frontend && npm run format

frontend-format-check:
	cd frontend && npm run format:check

frontend-type-check:
	cd frontend && npm run type-check

frontend-build:
	cd frontend && npm run build

frontend-dev:
	cd frontend && npm run dev

# Combined commands
test-all: test-unit frontend-test
	@echo "All tests completed!"

lint-all: lint frontend-lint
	@echo "All linting completed!"

format-all: format frontend-format
	@echo "All formatting completed!"
