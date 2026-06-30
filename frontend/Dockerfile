# Build stage
FROM --platform=$BUILDPLATFORM registry.access.redhat.com/hi/nodejs:26-builder@sha256:fc298d554863039773f9da00bc22775607a5f9115b1cf3ecc59290e36e571000 AS build

USER 0
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage (hi/nginx distroless — no shell, no package manager)
FROM registry.access.redhat.com/hi/nginx:1.30@sha256:0254744770cefbf63b68278bd2cc7ebdb1505d7d8c6a79a7a64fdf52cdb441f2

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 8080
