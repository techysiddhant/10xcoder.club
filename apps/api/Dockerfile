FROM --platform=linux/amd64 oven/bun:1.1.43 AS build

WORKDIR /app

# ---- Bun memory safety (FREE TIER SAFE) ----
ENV BUN_INSTALL_CACHE_DIR=/tmp/bun-cache
ENV BUN_MAX_CONCURRENCY=2
ENV BUN_MAX_HTTP_CONNECTIONS=2
ENV BUN_INSTALL_OPTIONAL=false
ENV NODE_ENV=production

# Cache install layer
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

# SAFE install
RUN bun install --frozen-lockfile --no-progress \
  && sync \
  && echo 3 > /proc/sys/vm/drop_caches || true

# Copy source AFTER install
COPY apps/api ./apps/api
COPY packages/schemas ./packages/schemas

# Build binary
RUN cd apps/api && bun run build:binary
