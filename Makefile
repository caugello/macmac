.PHONY: help test test-unit test-integration lint format clean install crawl enricher-stop \
	catalog-backup catalog-restore openshift-catalog-backup openshift-catalog-local-restore \
	frontend-install frontend-test frontend-lint frontend-format frontend-build \
	build-all build-gateway build-recipes build-catalog build-meal-plans build-auth build-crawler build-enricher \
	sbom verify-image

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
	@echo "Container builds:"
	@echo "  make build-all        Build all service images (:dev tag)"
	@echo "  make build-<service>  Build a single image (gateway, recipes, catalog,"
	@echo "                        meal-plans, auth, crawler, enricher)"
	@echo ""
	@echo "All:"
	@echo "  make test-all         Run all tests (backend + frontend)"
	@echo "  make lint-all         Run all linters (backend + frontend)"
	@echo "  make format-all       Format all code (backend + frontend)"
	@echo "  make clean            Remove generated files"
	@echo "  make crawl            Run the catalog crawler (manual trigger)"
	@echo "  make enricher-stop    Stop the catalog enricher"
	@echo "  make catalog-backup   Backup local catalog DB to backups/catalog.dump.gz"
	@echo "  make catalog-restore  Restore local catalog DB from backups/catalog.dump.gz"
	@echo ""
	@echo "Security (SLSA L3):"
	@echo "  make sbom             Scan all dependencies for vulnerabilities"
	@echo "  make verify-image IMAGE=<ref>  Verify image signature, provenance, and SBOM"
	@echo ""
	@echo "OpenShift:"
	@echo "  make openshift-catalog-backup        Dump catalog DB from OpenShift to backups/"
	@echo "  make openshift-catalog-local-restore  Restore OpenShift dump into local dev DB"
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

# Enricher management
enricher-stop:
	podman-compose -f podman-compose-dev.yaml stop catalog_enricher

# Catalog DB backup/restore
CATALOG_DB_CONTAINER := macmac-catalog_db-1
REDIS_CONTAINER := macmac-redis-1

catalog-backup:
	podman exec $(CATALOG_DB_CONTAINER) pg_dump -U dbuser -d catalog -Fc -f /tmp/catalog.dump
	podman cp $(CATALOG_DB_CONTAINER):/tmp/catalog.dump backups/catalog.dump.tmp
	gzip -c backups/catalog.dump.tmp > backups/catalog.dump.gz
	rm -f backups/catalog.dump.tmp
	@echo "Backup saved to backups/catalog.dump.gz"

catalog-restore:
	gunzip -c backups/catalog.dump.gz > backups/catalog.dump.tmp
	podman cp backups/catalog.dump.tmp $(CATALOG_DB_CONTAINER):/tmp/catalog.dump
	rm -f backups/catalog.dump.tmp
	podman exec $(CATALOG_DB_CONTAINER) pg_restore -U dbuser -d catalog --clean --if-exists /tmp/catalog.dump
	podman exec $(REDIS_CONTAINER) redis-cli -a $${REDIS_PASSWORD:-devpassword} --no-auth-warning --scan --pattern "catalog:*" | xargs -r podman exec -i $(REDIS_CONTAINER) redis-cli -a $${REDIS_PASSWORD:-devpassword} --no-auth-warning DEL
	@echo "Restored from backups/catalog.dump.gz (cache cleared)"

# OpenShift catalog DB backup/restore
OC_NAMESPACE := macmac
OC_CATALOG_POD := catalog-db-0
OC_DB_USER := macmac
OC_DB_NAME := catalog
OC_BACKUP_FILE := backups/openshift-catalog.dump.gz

openshift-catalog-backup:
	@mkdir -p backups
	oc exec $(OC_CATALOG_POD) -n $(OC_NAMESPACE) -- pg_dump -U $(OC_DB_USER) -d $(OC_DB_NAME) -Fc -f /tmp/catalog.dump
	oc cp $(OC_NAMESPACE)/$(OC_CATALOG_POD):/tmp/catalog.dump backups/openshift-catalog.dump.tmp
	gzip -c backups/openshift-catalog.dump.tmp > $(OC_BACKUP_FILE)
	rm -f backups/openshift-catalog.dump.tmp
	oc exec $(OC_CATALOG_POD) -n $(OC_NAMESPACE) -- rm -f /tmp/catalog.dump
	@echo "OpenShift backup saved to $(OC_BACKUP_FILE)"

openshift-catalog-local-restore:
	gunzip -c $(OC_BACKUP_FILE) > backups/openshift-catalog.dump.tmp
	podman cp backups/openshift-catalog.dump.tmp $(CATALOG_DB_CONTAINER):/tmp/catalog.dump
	rm -f backups/openshift-catalog.dump.tmp
	podman exec $(CATALOG_DB_CONTAINER) pg_restore -U dbuser -d catalog --clean --if-exists --no-owner /tmp/catalog.dump
	podman exec $(CATALOG_DB_CONTAINER) rm -f /tmp/catalog.dump
	podman exec $(REDIS_CONTAINER) redis-cli -a $${REDIS_PASSWORD:-devpassword} --no-auth-warning --scan --pattern "catalog:*" | xargs -r podman exec -i $(REDIS_CONTAINER) redis-cli -a $${REDIS_PASSWORD:-devpassword} --no-auth-warning DEL
	@echo "OpenShift dump restored to local dev DB (cache cleared)"

REGISTRY := quay.io/caugello
TAG := dev

build-gateway:
	podman build --target gateway -t $(REGISTRY)/macmac-gateway:$(TAG) -f Containerfile .

build-recipes:
	podman build --target recipes -t $(REGISTRY)/macmac-recipes:$(TAG) -f Containerfile .

build-catalog:
	podman build --target catalog -t $(REGISTRY)/macmac-catalog:$(TAG) -f Containerfile .

build-meal-plans:
	podman build --target meal-plans -t $(REGISTRY)/macmac-meal-plans:$(TAG) -f Containerfile .

build-auth:
	podman build --target auth -t $(REGISTRY)/macmac-auth:$(TAG) -f Containerfile .

build-crawler:
	podman build --target crawler -t $(REGISTRY)/macmac-crawler:$(TAG) -f Containerfile .

build-enricher:
	podman build --target enricher -t $(REGISTRY)/macmac-enricher:$(TAG) -f Containerfile .

build-all: build-gateway build-recipes build-catalog build-meal-plans build-auth build-crawler build-enricher
	@echo "All images built with tag :$(TAG)"

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

# Security / SLSA L3
sbom:
	@echo "Scanning Python dependencies for vulnerabilities..."
	@for req in requirements*.txt; do \
		echo "  Scanning $$req..."; \
		grype "file:$$req" --only-fixed --fail-on high; \
	done
	@if [ -f frontend/package-lock.json ]; then \
		echo "  Scanning frontend/package-lock.json..."; \
		grype "file:frontend/package-lock.json" --only-fixed --fail-on high; \
	fi
	@echo "No high/critical vulnerabilities found"

verify-image:
	@./scripts/verify-image.sh $(IMAGE)
