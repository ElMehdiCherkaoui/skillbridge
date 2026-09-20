# ---- Backend build ----
FROM golang:1.27-alpine AS backend-build
WORKDIR /src
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/skillbridge-api ./cmd/api

# ---- Frontend deps ----
FROM node:24-alpine AS frontend-deps
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# ---- Frontend build ----
FROM node:24-alpine AS frontend-build
WORKDIR /app
COPY --from=frontend-deps /app/node_modules ./node_modules
COPY frontend/ .
ARG NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

# ---- Runtime ----
FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata caddy nodejs
WORKDIR /app
COPY --from=backend-build /out/skillbridge-api ./skillbridge-api
COPY backend/migrations ./migrations
COPY --from=frontend-build /app/.next/standalone ./web
COPY --from=frontend-build /app/.next/static ./web/.next/static
COPY Caddyfile ./Caddyfile
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
ENV MIGRATIONS_DIR=/app/migrations
EXPOSE 8080
CMD ["sh", "-c", "cd /app/web && HOSTNAME=0.0.0.0 PORT=3000 node server.js & PORT=8081 /app/skillbridge-api & caddy run --config /app/Caddyfile --adapter caddyfile"]