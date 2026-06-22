# Build stage
FROM --platform=$BUILDPLATFORM registry.access.redhat.com/hi/nodejs:26-builder@sha256:735aa42655aace9a9af79d8560719f7ef66acfd12e47fe462bbd36dc41da22f7 AS build

USER 0
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage (hi/nginx distroless — no shell, no package manager)
FROM registry.access.redhat.com/hi/nginx:1.30@sha256:e2be644f0e3a9f2cb68104aa6bc5690f04382a746ec01ee379e0eaaf81a8098b

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 8080
