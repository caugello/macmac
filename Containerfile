# ── Base stage ──────────────────────────────────────────────
FROM registry.access.redhat.com/ubi9/python-312 AS base

USER root
RUN dnf install -y libpq-devel gcc && \
    dnf clean all && rm -rf /var/cache/dnf

WORKDIR /opt/app-root/src
COPY requirements-base.txt requirements-cache.txt requirements-messaging.txt ./
RUN pip install --no-cache-dir -r requirements-base.txt

COPY . .
USER 1001

# ── Gateway ─────────────────────────────────────────────────
FROM base AS gateway
USER root
RUN pip install --no-cache-dir -r requirements-cache.txt
USER 1001
EXPOSE 8000

# ── Recipes API ─────────────────────────────────────────────
FROM base AS recipes
USER root
RUN pip install --no-cache-dir -r requirements-cache.txt
USER 1001
EXPOSE 8001

# ── Catalog API ─────────────────────────────────────────────
FROM base AS catalog
USER root
RUN pip install --no-cache-dir -r requirements-cache.txt -r requirements-messaging.txt
USER 1001
EXPOSE 8002

# ── Meal Plans API ──────────────────────────────────────────
FROM base AS meal-plans
USER root
RUN pip install --no-cache-dir -r requirements-cache.txt
USER 1001
EXPOSE 8003

# ── Auth API ────────────────────────────────────────────────
FROM base AS auth
COPY requirements-auth.txt ./
USER root
RUN pip install --no-cache-dir -r requirements-auth.txt
USER 1001
EXPOSE 8004

# ── Catalog Crawler ─────────────────────────────────────────
FROM registry.access.redhat.com/ubi9/python-312 AS crawler

USER root
RUN dnf install -y \
    libpq-devel gcc \
    alsa-lib atk at-spi2-atk cups-libs libdrm mesa-libgbm \
    gtk3 libX11 libXcomposite libXdamage libXext libXfixes libXrandr \
    libxkbcommon pango cairo dbus-libs nss nspr libxshmfence \
    gstreamer1 gstreamer1-plugins-base \
    harfbuzz libwebp libjpeg-turbo libpng enchant2 \
    && dnf clean all && rm -rf /var/cache/dnf

WORKDIR /opt/app-root/src
COPY requirements-base.txt requirements-messaging.txt requirements-crawler.txt ./
RUN pip install --no-cache-dir -r requirements-crawler.txt
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-browsers
RUN mkdir -p /opt/playwright-browsers && playwright install chromium

COPY . .
USER 1001

# ── Catalog Enricher ────────────────────────────────────────
FROM registry.access.redhat.com/ubi9/python-312 AS enricher

USER root
RUN dnf install -y \
    libpq-devel gcc \
    alsa-lib atk at-spi2-atk cups-libs libdrm mesa-libgbm \
    gtk3 libX11 libXcomposite libXdamage libXext libXfixes libXrandr \
    libxkbcommon pango cairo dbus-libs nss nspr libxshmfence \
    gstreamer1 gstreamer1-plugins-base \
    harfbuzz libwebp libjpeg-turbo libpng enchant2 \
    && dnf clean all && rm -rf /var/cache/dnf

WORKDIR /opt/app-root/src
COPY requirements-enricher.txt requirements-base.txt requirements-cache.txt requirements-messaging.txt ./
RUN pip install --no-cache-dir -r requirements-enricher.txt
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-browsers
RUN mkdir -p /opt/playwright-browsers && playwright install chromium

COPY . .
USER 1001
