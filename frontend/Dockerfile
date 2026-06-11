# Build stage
FROM --platform=$BUILDPLATFORM registry.access.redhat.com/hi/nodejs:24-builder@sha256:a2ddd0ce564a349bd9e5596e15ba65f65e45f41ac2dbcfab1b967d20c059bb5b AS build

USER 0
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage (hi/nginx distroless — no shell, no package manager)
FROM registry.access.redhat.com/hi/nginx:1.28@sha256:6174f18fe74728fca3b281993e71d804338daa2116425eb210bc143e087ccddc

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 8080
