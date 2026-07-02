# Changelog

All notable changes to MacMac are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.12] - 2026-07-02

### Fixed

- **Catalog:** Persist the scraped per-unit price (e.g. €/kg) as ground truth for variable-weight goods sold by weight, so items priced per kilo are no longer stored as a fixed pack price paired with a hallucinated weight. A cross-check drops contradictory model-extracted price and quantity when they conflict with the scraped unit price (#482, #483)

## [0.2.11] - 2026-07-01

### Added

- **Catalog:** Three new Pantry categories — Baking & Cooking, Soups & Broths, and Herbs & Spices — giving baking and cooking ingredients, soups and broths, and dried herbs and spices a proper home in the taxonomy (#478, #479)
- **Catalog:** A zero-egress category re-classification backfill that re-derives product categories from already-stored product text, scoped by the food/non-food boundary so items never cross departments (#475, #476)

### Changed

- **Enricher:** Reconcile the extracted category against the item's food/non-food determination, so a product can no longer be filed into a department that contradicts its nature — alcohol excepted (#477)

### Fixed

- **Deploy:** Mirror missing API routes into the cluster ConfigMap so newly added endpoints resolve in production (#474)
- **CI:** Ignore an unfixed base-image OS CVE with no upstream patch that was blocking the enricher and crawler image builds (#480)

## [0.2.10] - 2026-06-30

### Added

- **Catalog:** Two-level product taxonomy — 8 departments spanning 36 categories, with existing items remapped onto the new structure via a migration (#470)

### Changed

- **Enricher:** Replace the fixed batch-pause throttle with an adaptive request pacer that holds a steady, configurable per-worker request rate (`ENRICHER_TARGET_RATE_PER_MIN`, default 2.7/min) regardless of per-item processing time, so faster non-food items no longer outpace the rate ceiling (#471)

## [0.2.9] - 2026-06-30

### Added

- **Frontend:** Continue the "Pantry Fresh" redesign across the app — rebuild the Dashboard and Planner to the new wires (#453), align the recipe screens (#455), reskin the Recipe Library (#461) and Groups screen (#456, #465), reskin the Shop list, product card, and product detail (#454), and close the remaining shopping-list design gaps (#451)
- **Recipes:** Per-user recipe favorites — mark recipes as favorites and filter the library by them (#460)
- **Recipes:** Dark immersive hero with compact stats on the recipe detail screen (#466)
- **Catalog:** Computed unit price (e.g. price per kg/L) on catalog items for easier price comparison (#459)
- **Crawler:** Forward-proxy fallback when a sitemap fetch is blocked by the upstream site's anti-bot protection, so scraping can continue from an alternate egress (#441)
- **CI:** Add the snitch image to the build matrix and a 14-day grace window for vulnerability-scan findings (#452)

### Changed

- **Meal Plans:** Polish the Shopping List UI to the Pantry Fresh design (#464)
- **Catalog:** Polish the filter chips and product cards to match the latest design (#463)

### Fixed

- **Enricher:** Lower the per-worker request-rate ceiling and remove the paid proxy fallback in favor of a circuit-breaker backoff when the upstream site rate-limits, making egress costs predictable (#467)
- **Deploy:** Pin the crawler image to its merge SHA for the anti-bot fallback fix (#442)

## [0.2.8] - 2026-06-29

### Added

- **Enricher:** Optional per-worker ISP/residential forward proxy for the local Chromium, configured via `ENRICHER_FORWARD_PROXY`, so datacenter VPS IPs blocked with a 456 can egress from a residential-classified IP; rate-limiting stays active in local mode and the Brightdata CDP fallback is unchanged (#438)

### Fixed

- **Catalog:** Treat HTTP 456 as a WAF/IP-reputation block instead of a permanent error — the enricher now records the block and retries via proxy, and the crawler gains a local-first, proxy-on-block fallback that reconnects over CDP for the remainder of the run (#437)
- **Deploy:** Sync the base `macmac-config` ConfigMap with the root config.yaml — add `cache.ttl.my_list` and the catalog `enricher`/`snitch` dependencies so v0.2.7 workloads no longer crash on boot with `KeyError 'my_list'` or a missing snitch dependency (#436)

## [0.2.7] - 2026-06-29

### Added

- **Deployment:** Migrate from OpenShift to single-node k3s on an OVH VPS — kustomize base + `ovh-k3s` overlay (#397), `Route`→`Ingress` with cert-manager (#398), resource requests/limits on every workload (#399), `local-path` storage for all PVCs (#400), RabbitMQ amqps exposed via hostPort 5671 (#401), cert-manager + Let's Encrypt issuers (#404), and out-of-band secret management with base placeholders deleted (#405). Epic #396
- **Deployment:** Ansible playbooks to bootstrap and harden the k3s host (#402, #403) and to deploy + harden remote enricher VPSes — podman quadlet service, firewalld deny-inbound-except-SSH, key-only SSH, fail2ban, unattended security updates (#351, #430, #431)
- **Catalog:** New central `snitch` service that consumes the enrichment-results queue and persists items to the catalog DB, decoupling DB writes from the enricher (#286, #299, #300, #301, #319, #432)
- **Enricher:** Publish enriched results to a results queue instead of writing the DB directly; DB libraries moved to an optional `db` extra so the enricher image is DB-free and deployable on untrusted remote workers (#286, #290, #301)
- **Enricher:** CA-verified TLS for `amqps://` RabbitMQ connections (#349); tag logs and results with `WORKER_LOCATION` (#350); residential-proxy support via CDP with WAF-block fallback and a circuit breaker for anti-bot detection; bounded, prioritised per-run re-enqueue volume (#355)
- **Frontend:** "Pantry Fresh" / Ivory Flux redesign across the app — design tokens (#367), shared primitives on a bento system (#368), pill navigation (#369), Login/Landing (#370), bento dashboard (#371), catalog list + cards (#377) and product detail (#378), recipe list/discovery (#372), detail (#373) and form (#374), meal-plan planner (#375), shopping-list modal (#376), My List FAB/sheet (#379), Groups page (#380), and the MacMac wordmark (#395); earlier Ivory Flux screens (#272, #313, #315)
- **Meal Plans:** Surface "My List" items as shopping-list extras with server-side persistence and login sync (#331, #332, #334, #335), inline catalog search and a quick "Add items" affordance to add extras (#333, #365)
- **Recipes:** Prep time, calories, difficulty, and images (#316, #328)
- **Observability:** Enrichment observability — DLQ depth metrics, RabbitMQ management UI, and a `/catalog/stats` endpoint (#357)
- **CI:** Integration test job backed by Postgres service containers (#323, #325)

### Fixed

- **Deploy:** RabbitMQ boots on k3s — `fsGroup` for 0640 secret mounts plus a `Recreate` strategy for the hostPort (#406); seed users via `load_definitions` since RabbitMQ has no PVC (#429); retarget ingress NetworkPolicies to Traefik and allow the ACME HTTP-01 solver (#411); order the sshd hardening drop-in first so it takes effect (#424); run the snitch from the catalog image instead of an unpublished one (#434)
- **Catalog:** Persist missing nutrition as SQL `NULL` instead of JSON `'null'` (#363)
- **Enricher:** Lock down SSRF on the nutrition-page crawl (#340, #348); handle hidden nutrition tables in collapsed accordions; use a fresh CDP session per crawl; skip the DB write when a crawl fails
- **Recipes:** Clear stale `group_id` when a user leaves a group; use the cart icon for My List everywhere and stop the FAB overlap (#337)
- **Frontend:** Clear critical vitest, esbuild, and js-yaml CVEs

### Changed

- **Deps:** Align Python constraints with the trusted-libraries index (#326, #336), bump vulnerable dependencies to clear HIGH CVEs, and roll up Dependabot groups (python-deps, frontend-container, actions, container); ignore frontend major upgrades pending migration (#307, #308)

## [0.2.6] - 2026-06-13

### Fixed

- **Catalog:** Use `vendor_product_id` as stable upsert key instead of `product_url` — vendor URL format changes no longer create duplicates or break recipe ingredient links (#268)
- **Enricher:** Bypass anti-bot detection with shared browser context, `AutomationControlled` disable, and session warm-up (#266, #267)
- **Frontend:** Fix shopping list print clipping caused by dialog positioning (#265)

## [0.2.5] - 2026-06-12

### Added

- **Frontend:** Day/week view toggle for meal plan calendar — day view (default on mobile) shows one day with prev/next navigation wrapping across weeks; week view (default on desktop) shows the full 7-day grid (#255, #258)
- **Frontend:** Copy Week modal with target week picker — clicking "Copy Week" opens a Radix Dialog where users pick a target Monday; warns if the target week already has meals (#256, #259)
- **Frontend:** Printable shopping list modal — replaces the broken inline shopping list with a Radix Dialog modal that generates, displays, and prints the list grouped by category (#257, #260)

### Fixed

- **Auth:** Forward JWT in service-to-service calls — `context_headers()` now sends `Authorization: Bearer` instead of the dead `X-User-*` headers; added logging to bare `except Exception` blocks in meal plans CRUD (#253)
- **Auth:** Refresh JWT with updated group_ids when accepting a group invitation (#262)
- **Recipes:** Lazy-backfill `group_id` on recipes created before the user joined a group — group members can now see each other's pre-existing recipes (#263)

## [0.2.4] - 2026-06-12

### Fixed

- **Frontend:** Fix pagination snap-back to page 1 — SearchBar debounce `useEffect` re-fired on every render because `onChange` was in the dependency array; replaced with `useRef` pattern (#243)
- **Frontend:** Memoize `handleSearchChange` and `handleCategoryChange` in CatalogList with `useCallback` to prevent unstable callback references (#244)
- **Frontend:** Exclude `index.html` from Workbox service worker precache — stale cached HTML could serve outdated JS bundle references after deploys (#245)

### Changed

- **CI:** Bump `actions/checkout` v6.0.2 → v6.0.3, `github/codeql-action` v4.36.0 → v4.36.2, `astral-sh/setup-uv` SHA update, `sigstore/cosign-installer` v3.8.2 → v4.1.2 (#242)

## [0.2.3] - 2026-06-12

### Added

- **Enricher:** Re-enrichment cron job that runs every 3 days — backfills items missing `image_url`, `nutrition`, or `nutriscore` and refreshes stale `price`/`promotion_until_date` by re-queuing to the existing enricher pipeline (#240)

### Fixed

- **Frontend:** Eliminate skeleton flash on catalog/recipe pagination — use `keepPreviousData` so the previous page stays visible while the next page loads (#239)
- **Infra:** Fix Valkey MISCONF error by disabling RDB persistence (`--save ""`) — writes were rejected when no persistent volume was mounted
- **Infra:** Fix NetworkPolicy blocking service-to-service calls from gateway to backend APIs

## [0.2.2] - 2026-06-12

### Fixed

- **Framework:** Add `is_food`, `start_date`, `end_date` query params to `build_query_dependency()` — food toggle, meal plan week navigation, and date range filters were silently ignored (#224)
- **Framework:** Add `ingredient` query param to `build_query_dependency()` — recipe ingredient filter had no effect (#231)
- **Catalog:** Restore `canonical_name` in search fields — multi-word queries against the displayed product name failed (#224)
- **Auth:** Declare `query_params` on group and invitation list routes so `limit`, `offset`, and `search` are forwarded (#229)
- **Frontend:** Keep RecipeSelectorModal open on creation error instead of closing and losing user input (#230)
- **Frontend:** Reset catalog pagination to page 1 on search input (#224)
- **Infra:** Update gateway deployment to `GatewayUvicornWorker` — duplicate header fix from #219 was merged but not deployed (#226)

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

[0.2.6]: https://github.com/caugello/macmac/compare/v0.2.5...v0.2.6
[0.2.5]: https://github.com/caugello/macmac/compare/v0.2.4...v0.2.5
[0.2.4]: https://github.com/caugello/macmac/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/caugello/macmac/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/caugello/macmac/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/caugello/macmac/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/caugello/macmac/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/caugello/macmac/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/caugello/macmac/compare/v0.0.1...v0.1.0
[0.0.1]: https://github.com/caugello/macmac/releases/tag/v0.0.1
