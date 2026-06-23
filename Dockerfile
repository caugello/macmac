# Supply-chain pinning: every external image (and the uv binary, pulled from a
# digest-locked uv image via COPY --from) is referenced by immutable @sha256
# digest, not a mutable tag. This blocks tag-reuse attacks and makes builds
# reproducible. To bump a base image, update its digest here after scanning.

# ── Builder stage (hi/python builder — has shell, no dnf) ──
FROM --platform=linux/amd64 registry.access.redhat.com/hi/python:3.12-builder@sha256:3d37bf07a9b663ac561e94dab30d771d0cb4a1dffbcd6aa4785af1d9b6bc5848 AS builder

ARG UV_INDEX_RHTL_USERNAME=""
ARG UV_INDEX_RHTL_PASSWORD=""

COPY --from=ghcr.io/astral-sh/uv:0.11.19@sha256:b46b03ddfcfbf8f547af7e9eaefdf8a39c8cebcba7c98858d3162bd28cf536f6 /uv /usr/local/bin/uv

USER 0
WORKDIR /build
COPY pyproject.toml uv.lock ./
COPY scripts/verify-packages.py scripts/redhat-release3.pub /tmp/scripts/

RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN --mount=type=secret,id=UV_INDEX_RHTL_USERNAME,required=false \
    --mount=type=secret,id=UV_INDEX_RHTL_PASSWORD,required=false \
    export UV_INDEX_RHTL_USERNAME="$(cat /run/secrets/UV_INDEX_RHTL_USERNAME 2>/dev/null || echo "$UV_INDEX_RHTL_USERNAME")" && \
    export UV_INDEX_RHTL_PASSWORD="$(cat /run/secrets/UV_INDEX_RHTL_PASSWORD 2>/dev/null || echo "$UV_INDEX_RHTL_PASSWORD")" && \
    uv export --frozen --no-emit-project -o /tmp/requirements.lock.txt && \
    uv pip install --require-hashes --no-cache --only-binary :all: \
        --python /opt/venv/bin/python -r /tmp/requirements.lock.txt && \
    python3 /tmp/scripts/verify-packages.py \
        --lockfile /build/uv.lock /opt/venv/lib/python3.12/site-packages

# ── Per-service builder stages (install extras) ────────────
FROM builder AS builder-gateway
ARG UV_INDEX_RHTL_USERNAME=""
ARG UV_INDEX_RHTL_PASSWORD=""
RUN --mount=type=secret,id=UV_INDEX_RHTL_USERNAME,required=false \
    --mount=type=secret,id=UV_INDEX_RHTL_PASSWORD,required=false \
    export UV_INDEX_RHTL_USERNAME="$(cat /run/secrets/UV_INDEX_RHTL_USERNAME 2>/dev/null || echo "$UV_INDEX_RHTL_USERNAME")" && \
    export UV_INDEX_RHTL_PASSWORD="$(cat /run/secrets/UV_INDEX_RHTL_PASSWORD 2>/dev/null || echo "$UV_INDEX_RHTL_PASSWORD")" && \
    uv export --frozen --no-emit-project --extra cache -o /tmp/requirements.lock.txt && \
    uv pip install --require-hashes --no-cache --only-binary :all: \
        --python /opt/venv/bin/python -r /tmp/requirements.lock.txt && \
    python3 /tmp/scripts/verify-packages.py \
        --lockfile /build/uv.lock /opt/venv/lib/python3.12/site-packages

FROM builder AS builder-recipes
ARG UV_INDEX_RHTL_USERNAME=""
ARG UV_INDEX_RHTL_PASSWORD=""
RUN --mount=type=secret,id=UV_INDEX_RHTL_USERNAME,required=false \
    --mount=type=secret,id=UV_INDEX_RHTL_PASSWORD,required=false \
    export UV_INDEX_RHTL_USERNAME="$(cat /run/secrets/UV_INDEX_RHTL_USERNAME 2>/dev/null || echo "$UV_INDEX_RHTL_USERNAME")" && \
    export UV_INDEX_RHTL_PASSWORD="$(cat /run/secrets/UV_INDEX_RHTL_PASSWORD 2>/dev/null || echo "$UV_INDEX_RHTL_PASSWORD")" && \
    uv export --frozen --no-emit-project --extra cache --extra db -o /tmp/requirements.lock.txt && \
    uv pip install --require-hashes --no-cache --only-binary :all: \
        --python /opt/venv/bin/python -r /tmp/requirements.lock.txt && \
    python3 /tmp/scripts/verify-packages.py \
        --lockfile /build/uv.lock /opt/venv/lib/python3.12/site-packages

FROM builder AS builder-catalog
ARG UV_INDEX_RHTL_USERNAME=""
ARG UV_INDEX_RHTL_PASSWORD=""
RUN --mount=type=secret,id=UV_INDEX_RHTL_USERNAME,required=false \
    --mount=type=secret,id=UV_INDEX_RHTL_PASSWORD,required=false \
    export UV_INDEX_RHTL_USERNAME="$(cat /run/secrets/UV_INDEX_RHTL_USERNAME 2>/dev/null || echo "$UV_INDEX_RHTL_USERNAME")" && \
    export UV_INDEX_RHTL_PASSWORD="$(cat /run/secrets/UV_INDEX_RHTL_PASSWORD 2>/dev/null || echo "$UV_INDEX_RHTL_PASSWORD")" && \
    uv export --frozen --no-emit-project --extra cache --extra messaging --extra db -o /tmp/requirements.lock.txt && \
    uv pip install --require-hashes --no-cache --only-binary :all: \
        --python /opt/venv/bin/python -r /tmp/requirements.lock.txt && \
    python3 /tmp/scripts/verify-packages.py \
        --lockfile /build/uv.lock /opt/venv/lib/python3.12/site-packages

FROM builder AS builder-meal-plans
ARG UV_INDEX_RHTL_USERNAME=""
ARG UV_INDEX_RHTL_PASSWORD=""
RUN --mount=type=secret,id=UV_INDEX_RHTL_USERNAME,required=false \
    --mount=type=secret,id=UV_INDEX_RHTL_PASSWORD,required=false \
    export UV_INDEX_RHTL_USERNAME="$(cat /run/secrets/UV_INDEX_RHTL_USERNAME 2>/dev/null || echo "$UV_INDEX_RHTL_USERNAME")" && \
    export UV_INDEX_RHTL_PASSWORD="$(cat /run/secrets/UV_INDEX_RHTL_PASSWORD 2>/dev/null || echo "$UV_INDEX_RHTL_PASSWORD")" && \
    uv export --frozen --no-emit-project --extra cache --extra db -o /tmp/requirements.lock.txt && \
    uv pip install --require-hashes --no-cache --only-binary :all: \
        --python /opt/venv/bin/python -r /tmp/requirements.lock.txt && \
    python3 /tmp/scripts/verify-packages.py \
        --lockfile /build/uv.lock /opt/venv/lib/python3.12/site-packages

FROM builder AS builder-auth
ARG UV_INDEX_RHTL_USERNAME=""
ARG UV_INDEX_RHTL_PASSWORD=""
RUN --mount=type=secret,id=UV_INDEX_RHTL_USERNAME,required=false \
    --mount=type=secret,id=UV_INDEX_RHTL_PASSWORD,required=false \
    export UV_INDEX_RHTL_USERNAME="$(cat /run/secrets/UV_INDEX_RHTL_USERNAME 2>/dev/null || echo "$UV_INDEX_RHTL_USERNAME")" && \
    export UV_INDEX_RHTL_PASSWORD="$(cat /run/secrets/UV_INDEX_RHTL_PASSWORD 2>/dev/null || echo "$UV_INDEX_RHTL_PASSWORD")" && \
    uv export --frozen --no-emit-project --extra auth --extra db -o /tmp/requirements.lock.txt && \
    uv pip install --require-hashes --no-cache --only-binary :all: \
        --python /opt/venv/bin/python -r /tmp/requirements.lock.txt && \
    python3 /tmp/scripts/verify-packages.py \
        --lockfile /build/uv.lock /opt/venv/lib/python3.12/site-packages

# ── Runtime base (hi/python distroless — no shell) ─────────
FROM --platform=linux/amd64 registry.access.redhat.com/hi/python:3.12@sha256:227cd08bc68a2fb2d79ed21d198c5dad0d130238feb4088881670296902c2754 AS runtime

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1
WORKDIR /app

# Run the API services as a non-root user (matches crawler/enricher). All
# gateway/recipes/catalog/meal-plans/auth stages inherit this. COPY layers
# still write as root (world-readable), so UID 1001 can read /app and /opt/venv.
USER 1001

# ── Gateway ─────────────────────────────────────────────────
FROM runtime AS gateway
COPY --from=builder-gateway /opt/venv /opt/venv
COPY . .
EXPOSE 8000

# ── Recipes API ─────────────────────────────────────────────
FROM runtime AS recipes
COPY --from=builder-recipes /opt/venv /opt/venv
COPY . .
EXPOSE 8001

# ── Catalog API ─────────────────────────────────────────────
FROM runtime AS catalog
COPY --from=builder-catalog /opt/venv /opt/venv
COPY . .
EXPOSE 8002

# ── Catalog Snitch (results-queue consumer, no HTTP port) ───
FROM runtime AS snitch
COPY --from=builder-catalog /opt/venv /opt/venv
COPY . .

# ── Meal Plans API ──────────────────────────────────────────
FROM runtime AS meal-plans
COPY --from=builder-meal-plans /opt/venv /opt/venv
COPY . .
EXPOSE 8003

# ── Auth API ────────────────────────────────────────────────
FROM runtime AS auth
COPY --from=builder-auth /opt/venv /opt/venv
COPY . .
EXPOSE 8004

# ── Shared browser base (ubi9-minimal + system deps) ────────
# System deps only. pip extras + Chromium install happen per-service:
# Playwright's `install` reads a version manifest written by the pip package.
FROM --platform=linux/amd64 registry.access.redhat.com/ubi9-minimal@sha256:1bc3c5c15720506a0cf48adfdf8b623dfe704377e007d7bbae8d14876392ca6a AS browser-base

USER root
RUN microdnf update -y --nodocs --setopt=install_weak_deps=0 && \
    microdnf install -y --nodocs --setopt=install_weak_deps=0 \
    python3.12 python3.12-pip \
    libpq findutils \
    alsa-lib atk at-spi2-atk cups-libs libdrm mesa-libgbm \
    gtk3 libX11 libXcomposite libXdamage libXext libXfixes libXrandr \
    libxkbcommon pango cairo dbus-libs nss nspr libxshmfence \
    harfbuzz libwebp libjpeg-turbo libpng \
    && microdnf clean all && rm -rf /var/cache/yum \
    && ln -s /usr/bin/python3.12 /usr/bin/python

COPY --from=ghcr.io/astral-sh/uv:0.11.19@sha256:b46b03ddfcfbf8f547af7e9eaefdf8a39c8cebcba7c98858d3162bd28cf536f6 /uv /usr/local/bin/uv

ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-browsers \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1
WORKDIR /opt/app-root/src

# ── Catalog Crawler ─────────────────────────────────────────
FROM browser-base AS crawler

ARG UV_INDEX_RHTL_USERNAME=""
ARG UV_INDEX_RHTL_PASSWORD=""

COPY pyproject.toml uv.lock ./
COPY scripts/verify-packages.py scripts/redhat-release3.pub /tmp/scripts/
RUN --mount=type=secret,id=UV_INDEX_RHTL_USERNAME,required=false \
    --mount=type=secret,id=UV_INDEX_RHTL_PASSWORD,required=false \
    export UV_INDEX_RHTL_USERNAME="$(cat /run/secrets/UV_INDEX_RHTL_USERNAME 2>/dev/null || echo "$UV_INDEX_RHTL_USERNAME")" && \
    export UV_INDEX_RHTL_PASSWORD="$(cat /run/secrets/UV_INDEX_RHTL_PASSWORD 2>/dev/null || echo "$UV_INDEX_RHTL_PASSWORD")" && \
    uv export --frozen --no-emit-project --extra crawler --extra messaging -o /tmp/requirements.lock.txt && \
    uv pip install --require-hashes --system --no-cache --only-binary :all: \
        --python /usr/bin/python3.12 -r /tmp/requirements.lock.txt && \
    python3.12 /tmp/scripts/verify-packages.py --lockfile /opt/app-root/src/uv.lock \
        "$(/usr/bin/python3.12 -c 'import sysconfig; print(sysconfig.get_path("purelib"))')" && \
    rm -rf /tmp/scripts /tmp/requirements.lock.txt
RUN mkdir -p /opt/playwright-browsers && /usr/bin/python3.12 -m playwright install chromium
RUN /usr/bin/python3.12 -m pip uninstall -y pip setuptools 2>/dev/null; true

COPY . .
USER 1001

# ── Catalog Enricher ────────────────────────────────────────
FROM browser-base AS enricher

ARG UV_INDEX_RHTL_USERNAME=""
ARG UV_INDEX_RHTL_PASSWORD=""

COPY pyproject.toml uv.lock ./
COPY scripts/verify-packages.py scripts/redhat-release3.pub /tmp/scripts/
RUN --mount=type=secret,id=UV_INDEX_RHTL_USERNAME,required=false \
    --mount=type=secret,id=UV_INDEX_RHTL_PASSWORD,required=false \
    export UV_INDEX_RHTL_USERNAME="$(cat /run/secrets/UV_INDEX_RHTL_USERNAME 2>/dev/null || echo "$UV_INDEX_RHTL_USERNAME")" && \
    export UV_INDEX_RHTL_PASSWORD="$(cat /run/secrets/UV_INDEX_RHTL_PASSWORD 2>/dev/null || echo "$UV_INDEX_RHTL_PASSWORD")" && \
    uv export --frozen --no-emit-project --extra enricher --extra messaging -o /tmp/requirements.lock.txt && \
    uv pip install --require-hashes --system --no-cache --only-binary :all: \
        --python /usr/bin/python3.12 -r /tmp/requirements.lock.txt && \
    python3.12 /tmp/scripts/verify-packages.py --lockfile /opt/app-root/src/uv.lock \
        "$(/usr/bin/python3.12 -c 'import sysconfig; print(sysconfig.get_path("purelib"))')" && \
    rm -rf /tmp/scripts /tmp/requirements.lock.txt
RUN mkdir -p /opt/playwright-browsers && /usr/bin/python3.12 -m playwright install chromium
RUN /usr/bin/python3.12 -m pip uninstall -y pip setuptools 2>/dev/null; true

COPY . .
USER 1001
