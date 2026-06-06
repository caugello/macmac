# ── Builder stage (hi/python builder — has shell, no dnf) ──
FROM --platform=linux/amd64 registry.access.redhat.com/hi/python:3.12-builder AS builder

ARG UV_INDEX_RHTL_USERNAME=""
ARG UV_INDEX_RHTL_PASSWORD=""

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

USER 0
WORKDIR /build
COPY pyproject.toml uv.lock ./

RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN --mount=type=secret,id=UV_INDEX_RHTL_USERNAME,required=false \
    --mount=type=secret,id=UV_INDEX_RHTL_PASSWORD,required=false \
    UV_INDEX_RHTL_USERNAME="$(cat /run/secrets/UV_INDEX_RHTL_USERNAME 2>/dev/null || echo "$UV_INDEX_RHTL_USERNAME")" \
    UV_INDEX_RHTL_PASSWORD="$(cat /run/secrets/UV_INDEX_RHTL_PASSWORD 2>/dev/null || echo "$UV_INDEX_RHTL_PASSWORD")" \
    uv pip install --no-cache --only-binary :all: --python /opt/venv/bin/python -r pyproject.toml

# ── Per-service builder stages (install extras) ────────────
FROM builder AS builder-gateway
ARG UV_INDEX_RHTL_USERNAME=""
ARG UV_INDEX_RHTL_PASSWORD=""
RUN --mount=type=secret,id=UV_INDEX_RHTL_USERNAME,required=false \
    --mount=type=secret,id=UV_INDEX_RHTL_PASSWORD,required=false \
    UV_INDEX_RHTL_USERNAME="$(cat /run/secrets/UV_INDEX_RHTL_USERNAME 2>/dev/null || echo "$UV_INDEX_RHTL_USERNAME")" \
    UV_INDEX_RHTL_PASSWORD="$(cat /run/secrets/UV_INDEX_RHTL_PASSWORD 2>/dev/null || echo "$UV_INDEX_RHTL_PASSWORD")" \
    uv pip install --no-cache --only-binary :all: --python /opt/venv/bin/python -r pyproject.toml --extra cache

FROM builder AS builder-recipes
ARG UV_INDEX_RHTL_USERNAME=""
ARG UV_INDEX_RHTL_PASSWORD=""
RUN --mount=type=secret,id=UV_INDEX_RHTL_USERNAME,required=false \
    --mount=type=secret,id=UV_INDEX_RHTL_PASSWORD,required=false \
    UV_INDEX_RHTL_USERNAME="$(cat /run/secrets/UV_INDEX_RHTL_USERNAME 2>/dev/null || echo "$UV_INDEX_RHTL_USERNAME")" \
    UV_INDEX_RHTL_PASSWORD="$(cat /run/secrets/UV_INDEX_RHTL_PASSWORD 2>/dev/null || echo "$UV_INDEX_RHTL_PASSWORD")" \
    uv pip install --no-cache --only-binary :all: --python /opt/venv/bin/python -r pyproject.toml --extra cache

FROM builder AS builder-catalog
ARG UV_INDEX_RHTL_USERNAME=""
ARG UV_INDEX_RHTL_PASSWORD=""
RUN --mount=type=secret,id=UV_INDEX_RHTL_USERNAME,required=false \
    --mount=type=secret,id=UV_INDEX_RHTL_PASSWORD,required=false \
    UV_INDEX_RHTL_USERNAME="$(cat /run/secrets/UV_INDEX_RHTL_USERNAME 2>/dev/null || echo "$UV_INDEX_RHTL_USERNAME")" \
    UV_INDEX_RHTL_PASSWORD="$(cat /run/secrets/UV_INDEX_RHTL_PASSWORD 2>/dev/null || echo "$UV_INDEX_RHTL_PASSWORD")" \
    uv pip install --no-cache --only-binary :all: --python /opt/venv/bin/python -r pyproject.toml --extra cache --extra messaging

FROM builder AS builder-meal-plans
ARG UV_INDEX_RHTL_USERNAME=""
ARG UV_INDEX_RHTL_PASSWORD=""
RUN --mount=type=secret,id=UV_INDEX_RHTL_USERNAME,required=false \
    --mount=type=secret,id=UV_INDEX_RHTL_PASSWORD,required=false \
    UV_INDEX_RHTL_USERNAME="$(cat /run/secrets/UV_INDEX_RHTL_USERNAME 2>/dev/null || echo "$UV_INDEX_RHTL_USERNAME")" \
    UV_INDEX_RHTL_PASSWORD="$(cat /run/secrets/UV_INDEX_RHTL_PASSWORD 2>/dev/null || echo "$UV_INDEX_RHTL_PASSWORD")" \
    uv pip install --no-cache --only-binary :all: --python /opt/venv/bin/python -r pyproject.toml --extra cache

FROM builder AS builder-auth
ARG UV_INDEX_RHTL_USERNAME=""
ARG UV_INDEX_RHTL_PASSWORD=""
RUN --mount=type=secret,id=UV_INDEX_RHTL_USERNAME,required=false \
    --mount=type=secret,id=UV_INDEX_RHTL_PASSWORD,required=false \
    UV_INDEX_RHTL_USERNAME="$(cat /run/secrets/UV_INDEX_RHTL_USERNAME 2>/dev/null || echo "$UV_INDEX_RHTL_USERNAME")" \
    UV_INDEX_RHTL_PASSWORD="$(cat /run/secrets/UV_INDEX_RHTL_PASSWORD 2>/dev/null || echo "$UV_INDEX_RHTL_PASSWORD")" \
    uv pip install --no-cache --only-binary :all: --python /opt/venv/bin/python -r pyproject.toml --extra auth

# ── Runtime base (hi/python distroless — no shell) ─────────
FROM --platform=linux/amd64 registry.access.redhat.com/hi/python:3.12 AS runtime

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1
WORKDIR /app

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
FROM --platform=linux/amd64 registry.access.redhat.com/ubi9-minimal AS browser-base

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

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-browsers \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1
WORKDIR /opt/app-root/src

# ── Catalog Crawler ─────────────────────────────────────────
FROM browser-base AS crawler

ARG UV_INDEX_RHTL_USERNAME=""
ARG UV_INDEX_RHTL_PASSWORD=""

COPY pyproject.toml uv.lock ./
RUN --mount=type=secret,id=UV_INDEX_RHTL_USERNAME,required=false \
    --mount=type=secret,id=UV_INDEX_RHTL_PASSWORD,required=false \
    UV_INDEX_RHTL_USERNAME="$(cat /run/secrets/UV_INDEX_RHTL_USERNAME 2>/dev/null || echo "$UV_INDEX_RHTL_USERNAME")" \
    UV_INDEX_RHTL_PASSWORD="$(cat /run/secrets/UV_INDEX_RHTL_PASSWORD 2>/dev/null || echo "$UV_INDEX_RHTL_PASSWORD")" \
    uv pip install --system --no-cache --only-binary :all: --python /usr/bin/python3.12 -r pyproject.toml --extra crawler --extra messaging
RUN mkdir -p /opt/playwright-browsers && /usr/bin/python3.12 -m playwright install chromium
RUN /usr/bin/python3.12 -m pip uninstall -y pip setuptools 2>/dev/null; true

COPY . .
USER 1001

# ── Catalog Enricher ────────────────────────────────────────
FROM browser-base AS enricher

ARG UV_INDEX_RHTL_USERNAME=""
ARG UV_INDEX_RHTL_PASSWORD=""

COPY pyproject.toml uv.lock ./
RUN --mount=type=secret,id=UV_INDEX_RHTL_USERNAME,required=false \
    --mount=type=secret,id=UV_INDEX_RHTL_PASSWORD,required=false \
    UV_INDEX_RHTL_USERNAME="$(cat /run/secrets/UV_INDEX_RHTL_USERNAME 2>/dev/null || echo "$UV_INDEX_RHTL_USERNAME")" \
    UV_INDEX_RHTL_PASSWORD="$(cat /run/secrets/UV_INDEX_RHTL_PASSWORD 2>/dev/null || echo "$UV_INDEX_RHTL_PASSWORD")" \
    uv pip install --system --no-cache --only-binary :all: --python /usr/bin/python3.12 -r pyproject.toml --extra enricher --extra cache --extra messaging
RUN mkdir -p /opt/playwright-browsers && /usr/bin/python3.12 -m playwright install chromium
RUN /usr/bin/python3.12 -m pip uninstall -y pip setuptools 2>/dev/null; true

COPY . .
USER 1001
