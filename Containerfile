# ── Base stage ──────────────────────────────────────────────
FROM registry.access.redhat.com/ubi9/python-312 AS base

USER root
RUN dnf update -y && \
    dnf install -y libpq-devel gcc && \
    dnf remove -y nodejs npm nodejs-docs nodejs-full-i18n 2>/dev/null; \
    dnf clean all && rm -rf /var/cache/dnf

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /opt/app-root/src
COPY pyproject.toml uv.lock ./
RUN uv pip install --system --no-cache --python /opt/app-root/bin/python -r pyproject.toml

COPY . .
USER 1001

# ── Gateway ─────────────────────────────────────────────────
FROM base AS gateway
USER root
RUN uv pip install --system --no-cache --python /opt/app-root/bin/python -r pyproject.toml --extra cache
USER 1001
EXPOSE 8000

# ── Recipes API ─────────────────────────────────────────────
FROM base AS recipes
USER root
RUN uv pip install --system --no-cache --python /opt/app-root/bin/python -r pyproject.toml --extra cache
USER 1001
EXPOSE 8001

# ── Catalog API ─────────────────────────────────────────────
FROM base AS catalog
USER root
RUN uv pip install --system --no-cache --python /opt/app-root/bin/python -r pyproject.toml --extra cache --extra messaging
USER 1001
EXPOSE 8002

# ── Meal Plans API ──────────────────────────────────────────
FROM base AS meal-plans
USER root
RUN uv pip install --system --no-cache --python /opt/app-root/bin/python -r pyproject.toml --extra cache
USER 1001
EXPOSE 8003

# ── Auth API ────────────────────────────────────────────────
FROM base AS auth
USER root
RUN uv pip install --system --no-cache --python /opt/app-root/bin/python -r pyproject.toml --extra auth
USER 1001
EXPOSE 8004

# ── Catalog Crawler ─────────────────────────────────────────
FROM registry.access.redhat.com/ubi9/python-312 AS crawler

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
RUN uv pip install --system --no-cache --python /opt/app-root/bin/python -r pyproject.toml --extra crawler --extra messaging
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-browsers
RUN mkdir -p /opt/playwright-browsers && playwright install chromium

COPY . .
USER 1001

# ── Catalog Enricher ────────────────────────────────────────
FROM registry.access.redhat.com/ubi9/python-312 AS enricher

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
RUN uv pip install --system --no-cache --python /opt/app-root/bin/python -r pyproject.toml --extra enricher --extra cache --extra messaging
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-browsers
RUN mkdir -p /opt/playwright-browsers && playwright install chromium

COPY . .
USER 1001
