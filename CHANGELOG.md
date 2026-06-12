# Changelog

All notable changes to MacMac are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2026-06-12

### Changed

- **Infra:** Migrate dev PostgreSQL containers from Fedora to Red Hat Hardened Images (`hi/postgresql:18`) with Docker-upstream env vars (`POSTGRES_*`), `PGDATA` subdirectory for tmpfs compatibility (#221)
- **Infra:** Replace Redis Alpine with Red Hat Hardened Valkey (`hi/valkey:latest`) (#218)
- **CI:** Pin Conforma ec binary to fixed release version (#209)

### Fixed

- **Cache:** Serialize UUID, datetime, and date objects in Redis cache values (#216)
- **Catalog:** Search across `normalized_name`, `raw_name`, and `brand` fields instead of only `canonical_name` (#217)
- **Enricher:** Reuse a single Chromium browser instance across all products instead of launching one per batch (#220)
- **Gateway:** Eliminate duplicate `date` and `server` response headers from proxied responses (#219)
- **Frontend:** Remove redundant `CMD` in nginx Dockerfile that conflicted with `hi/nginx` base image entrypoint (#210)
- **Infra:** Fix Valkey entrypoint (remove `redis-server` command prefix) and healthcheck (`valkey-cli` instead of `redis-cli`) (#222)

## [0.2.0] - 2026-06-11

### Added

- **Recipes:** Category counts endpoint — server-side aggregated counts per category, replacing client-side counting from first 100 recipes (#150)
- **Frontend:** Food-only toggle in ingredient autocomplete — checkbox filter + "(Non-food)" labels (#60)
- **CI:** CodeQL and Bandit SAST scanning on pull requests (#193)
- **CI:** Conforma (ec) policy verification pinned to v0.9.44 with SHA256 checksum (#195, #198)
- **CI:** Environment protection gate on workflow_dispatch (#196)

### Changed

- **CI:** Migrated SBOM attestation from `push-to-registry` to GitHub attestation API — quay.io rejects OCI referrer uploads (#199)
- **CI:** Migrated base image attestation from `cosign attest` to `actions/attest` — same quay.io incompatibility (#200)
- **CI:** Use `podman push --digestfile` for registry digest — local digest from `podman inspect` could differ from remote (#203)
- **Deps:** Resolve beautifulsoup4 (4.15.0) and soupsieve from RHTL instead of PyPI (#204)
- **Config:** Bump app and service versions to 0.2.0

### Fixed

- **Auth:** Verify JWT in downstream services instead of trusting gateway-injected headers (#192)
- **Shared:** Cache Redis connection failure to prevent per-request timeouts (#191)
- **Shared:** Prevent SSRF via URL validation and pagination DoS via max limit (#190)
- **Config:** Remove credentials from tracked config.yaml (#194)

### Security

- 86 of 88 Python packages now resolve from Red Hat Trusted Libraries
- All attestations now record the correct registry digest (was silently wrong before #203)

## [0.1.1] - 2026-05-20

### Added

- **Shared:** Unit conversion utilities for ingredient aggregation in shopping lists (#28)
- **CI:** SLSA L3 Phase 1 — dual CVE scanning (Grype + Trivy), SBOM generation, image signing with Cosign, build provenance attestation (#29, #30)
- **CI:** PR security checks — dependency review, vulnerability scanning (#30)

### Changed

- **Frontend:** Limit category filter chips display (#27)

### Fixed

- **Frontend:** Improve landing page copywriting (#25)

## [0.1.0] - 2026-05-20

### Added

- **Frontend:** PWA support for iOS — installable home screen app (#23)
- **Enricher:** Retry logic, upsert support, and crash resilience (#22)

### Changed

- **Frontend:** Reduce animations to list items only for performance (#24)

### Fixed

- **Frontend:** Switch to UBI nginx base and fix cross-platform build (#21)

## [0.0.1] - 2026-05-17

Initial release. Core meal planning platform with microservices architecture.

### Added

- **Gateway:** FastAPI proxy with JWT authentication, CORS, rate limiting
- **Recipes:** CRUD API with category filtering, servings field, ownership isolation
- **Catalog:** Product catalog with crawler (Playwright) and enricher (OpenAI GPT-4o-mini)
- **Meal Plans:** Weekly meal planning with copy, shopping list generation, inline notes
- **Auth:** Firebase Authentication with group invitation system, member management
- **Frontend:** React 18 SPA with Terracotta Dark design system, mobile-first responsive layouts, quick recipe creation from meal plan view
- **Infrastructure:** Per-service PostgreSQL databases, Redis caching, RabbitMQ messaging
- **CI/CD:** GitHub Actions build-and-push workflow, Dependabot for dependency updates
- **Containers:** Multi-stage Dockerfile with UBI9 base images, non-root runtime (USER 1001)

### Security

- JWT-based authentication on all API endpoints
- Per-user ownership isolation on all data queries
- Input validation with Pydantic schemas
- Hardened container images with security patches

---

### Version History (infrastructure milestones between releases)

#### 2026-06-06 — Supply Chain Hardening

- Migrated from pip to uv with lockfile integrity verification
- Migrated to Red Hat Hardened Images (hi/python, hi/nginx, hi/nodejs)
- Red Hat Trusted Libraries as primary package index
- All container images pinned to digest hashes
- RHTL package verification with cryptographic attestation
- Replaced psycopg2-binary with pg8000 (pure Python, available on RHTL)
- Base image signature and SLSA provenance verification before build
- ubi9-minimal for crawler/enricher with shared browser-base stage

#### 2026-06-10 — Security Audit Remediations

- Excluded CI tool downloads from container images
- Removed production data and secrets from builds
- SSRF prevention and pagination DoS protection
- Authenticated ghcr.io before base image verification

[0.2.1]: https://github.com/caugello/macmac/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/caugello/macmac/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/caugello/macmac/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/caugello/macmac/compare/v0.0.1...v0.1.0
[0.0.1]: https://github.com/caugello/macmac/releases/tag/v0.0.1
