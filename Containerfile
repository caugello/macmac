# ── Builder stage (hi/python builder — has shell, no dnf) ──
FROM --platform=linux/amd64 registry.access.redhat.com/hi/python:3.12-builder AS builder

ARG UV_INDEX_RHTL_USERNAME
ARG UV_INDEX_RHTL_PASSWORD
ENV UV_INDEX_RHTL_USERNAME=${UV_INDEX_RHTL_USERNAME}
ENV UV_INDEX_RHTL_PASSWORD=${UV_INDEX_RHTL_PASSWORD}

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

USER 0
WORKDIR /build
COPY pyproject.toml uv.lock ./

RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN uv pip install --no-cache --only-binary :all: --python /opt/venv/bin/python -r pyproject.toml

# ── Per-service builder stages (install extras) ────────────
FROM builder AS builder-gateway
RUN uv pip install --no-cache --only-binary :all: --python /opt/venv/bin/python -r pyproject.toml --extra cache

FROM builder AS builder-recipes
RUN uv pip install --no-cache --only-binary :all: --python /opt/venv/bin/python -r pyproject.toml --extra cache

FROM builder AS builder-catalog
RUN uv pip install --no-cache --only-binary :all: --python /opt/venv/bin/python -r pyproject.toml --extra cache --extra messaging

FROM builder AS builder-meal-plans
RUN uv pip install --no-cache --only-binary :all: --python /opt/venv/bin/python -r pyproject.toml --extra cache

FROM builder AS builder-auth
RUN uv pip install --no-cache --only-binary :all: --python /opt/venv/bin/python -r pyproject.toml --extra auth

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

# ── Catalog Crawler ─────────────────────────────────────────
FROM --platform=linux/amd64 registry.access.redhat.com/ubi9/python-312 AS crawler

ARG UV_INDEX_RHTL_USERNAME
ARG UV_INDEX_RHTL_PASSWORD

USER root
RUN dnf update -y && \
    dnf install -y \
    libpq-devel gcc \
    alsa-lib atk at-spi2-atk cups-libs libdrm mesa-libgbm \
    gtk3 libX11 libXcomposite libXdamage libXext libXfixes libXrandr \
    libxkbcommon pango cairo dbus-libs nss nspr libxshmfence \
    gstreamer1 gstreamer1-plugins-base \
    harfbuzz libwebp libjpeg-turbo libpng enchant2 \
    && dnf remove -y nodejs npm nodejs-docs nodejs-full-i18n 2>/dev/null; \
    dnf clean all && rm -rf /var/cache/dnf

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /opt/app-root/src
COPY pyproject.toml uv.lock ./
RUN UV_INDEX_RHTL_USERNAME="${UV_INDEX_RHTL_USERNAME}" \
    UV_INDEX_RHTL_PASSWORD="${UV_INDEX_RHTL_PASSWORD}" \
    uv pip install --system --no-cache --only-binary :all: --python /opt/app-root/bin/python -r pyproject.toml --extra crawler --extra messaging
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-browsers
RUN mkdir -p /opt/playwright-browsers && playwright install chromium

COPY . .
USER 1001

# ── Catalog Enricher ────────────────────────────────────────
FROM --platform=linux/amd64 registry.access.redhat.com/ubi9/python-312 AS enricher

ARG UV_INDEX_RHTL_USERNAME
ARG UV_INDEX_RHTL_PASSWORD

USER root
RUN dnf update -y && \
    dnf install -y \
    libpq-devel gcc \
    alsa-lib atk at-spi2-atk cups-libs libdrm mesa-libgbm \
    gtk3 libX11 libXcomposite libXdamage libXext libXfixes libXrandr \
    libxkbcommon pango cairo dbus-libs nss nspr libxshmfence \
    gstreamer1 gstreamer1-plugins-base \
    harfbuzz libwebp libjpeg-turbo libpng enchant2 \
    && dnf remove -y nodejs npm nodejs-docs nodejs-full-i18n 2>/dev/null; \
    dnf clean all && rm -rf /var/cache/dnf

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /opt/app-root/src
COPY pyproject.toml uv.lock ./
RUN UV_INDEX_RHTL_USERNAME="${UV_INDEX_RHTL_USERNAME}" \
    UV_INDEX_RHTL_PASSWORD="${UV_INDEX_RHTL_PASSWORD}" \
    uv pip install --system --no-cache --only-binary :all: --python /opt/app-root/bin/python -r pyproject.toml --extra enricher --extra cache --extra messaging
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-browsers
RUN mkdir -p /opt/playwright-browsers && playwright install chromium

COPY . .
USER 1001
