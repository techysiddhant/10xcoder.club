# =============================================================================
# 10xcoder.club API Dockerfile (Production Safe)
# =============================================================================

# -----------------------------------------------------------------------------
# Base image (Alpine + Bun) - pinned to amd64 for EC2
# -----------------------------------------------------------------------------
FROM --platform=linux/amd64 oven/bun:1.1.43-alpine AS base
WORKDIR /app

# -----------------------------------------------------------------------------
# Stage 1 — Install dependencies (cached)
# -----------------------------------------------------------------------------
FROM base AS install

# ---- Bun memory safety (critical for free tier) ----
ENV NODE_ENV=development
ENV BUN_MAX_CONCURRENCY=2
ENV BUN_MAX_HTTP_CONNECTIONS=2
ENV BUN_INSTALL_OPTIONAL=false

# Dev dependencies
RUN mkdir -p /temp/dev
COPY package.json bun.lock tsconfig.base.json /temp/dev/

# Workspace manifests
COPY apps/api/package.json /temp/dev/apps/api/
COPY apps/web/package.json /temp/dev/apps/web/
COPY packages/schemas/package.json /temp/dev/packages/schemas/
COPY packages/ui/package.json /temp/dev/packages/ui/
COPY packages/eslint-config/package.json /temp/dev/packages/eslint-config/
COPY packages/typescript-config/package.json /temp/dev/packages/typescript-config/

RUN cd /temp/dev && bun install --frozen-lockfile --no-progress

# Prod dependencies
RUN mkdir -p /temp/prod
COPY package.json bun.lock tsconfig.base.json /temp/prod/

COPY apps/api/package.json /temp/prod/apps/api/
COPY apps/web/package.json /temp/prod/apps/web/
COPY packages/schemas/package.json /temp/prod/packages/schemas/
COPY packages/ui/package.json /temp/prod/packages/ui/
COPY packages/eslint-config/package.json /temp/prod/packages/eslint-config/
COPY packages/typescript-config/package.json /temp/prod/packages/typescript-config/

RUN cd /temp/prod && bun install --frozen-lockfile --production --ignore-scripts --no-progress

# -----------------------------------------------------------------------------
# Stage 2 — Build
# -----------------------------------------------------------------------------
FROM base AS build

ENV NODE_ENV=production

# Copy dev deps
COPY --from=install /temp/dev/node_modules ./node_modules

# Copy source
COPY tsconfig.base.json ./
COPY apps/api ./apps/api
COPY packages/schemas ./packages/schemas

# Build API (TypeScript → compiled binary for linux/amd64)
RUN cd apps/api && bun run build

# -----------------------------------------------------------------------------
# Stage 3 — Runtime (production)
# -----------------------------------------------------------------------------
# Using alpine for minimal image size - compiled binary is self-contained
FROM --platform=linux/amd64 alpine:3.20 AS release

WORKDIR /app

# Labels for container metadata
LABEL org.opencontainers.image.source="https://github.com/techysiddhant/10xcoder.club"
LABEL org.opencontainers.image.description="10xcoder.club API Server"

ENV NODE_ENV=production
ENV PORT=3000

# Install minimal runtime deps (for healthchecks)
RUN apk add --no-cache ca-certificates wget

# Copy compiled binary (self-contained, no node_modules needed)
COPY --from=build /app/apps/api/server.js ./server
RUN chmod +x ./server

# Copy drizzle migrations (runtime usage)
COPY --from=build /app/apps/api/drizzle ./drizzle

EXPOSE 3000

CMD ["./server"]
