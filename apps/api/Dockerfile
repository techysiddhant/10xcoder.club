# =============================================================================
# 10xcoder.club API Server Dockerfile
# =============================================================================
# Multi-stage build for production deployment
# - Stage 1 (build): Compiles TypeScript to a single Bun binary
# - Stage 2 (production): Minimal Alpine image with the compiled binary
# =============================================================================

FROM --platform=linux/amd64 oven/bun:1.1.43 AS build

WORKDIR /app

# Cache install layer (monorepo-aware)
# Copy all package.json files to ensure lockfile integrity
COPY package.json ./package.json
COPY bun.lock ./bun.lock
COPY tsconfig.base.json ./tsconfig.base.json

# Apps
COPY apps/api/package.json ./apps/api/package.json
COPY apps/api/tsconfig.json ./apps/api/tsconfig.json
COPY apps/web/package.json ./apps/web/package.json

# Packages
COPY packages/schemas/package.json ./packages/schemas/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/eslint-config/package.json ./packages/eslint-config/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json

RUN bun install --frozen-lockfile

# Copy source
COPY apps/api ./apps/api
COPY packages/schemas ./packages/schemas

ENV NODE_ENV=production

# Build a single portable binary (Elysia deploy guide)
# https://elysiajs.com/patterns/deploy.html
RUN bun --cwd apps/api run build:binary

# Production image - using alpine for healthcheck support (wget/curl available)
# Note: distroless doesn't have wget/curl which breaks docker-compose healthchecks
FROM --platform=linux/amd64 alpine:3.19

# Labels for container metadata (OCI standard) - must be in final stage
LABEL org.opencontainers.image.source="https://github.com/techysiddhant/10xcoder.club"
LABEL org.opencontainers.image.description="10xcoder.club API Server"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.vendor="10xcoder.club"

WORKDIR /app

# Install only what's needed for healthcheck and runtime
RUN apk add --no-cache wget ca-certificates

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/apps/api/server.js ./server

# Copy drizzle migrations for runtime migrations
COPY --from=build /app/apps/api/drizzle ./drizzle

# Make server executable
RUN chmod +x ./server

EXPOSE 3000

CMD ["./server"]
