# syntax=docker/dockerfile:1

# =============================================================================
# 10xcoder.club API Dockerfile - Production Ready for AWS EC2
# =============================================================================
# Build from monorepo root: docker build -f apps/api/Dockerfile .
# =============================================================================

# -----------------------------------------------------------------------------
# Build stage - Debian with Bun
# -----------------------------------------------------------------------------
FROM --platform=linux/amd64 oven/bun:1.3.9-slim AS build

WORKDIR /app

ENV NODE_ENV=production

# --- Install deps (monorepo-aware) ---
COPY package.json bun.lock tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/api-types/package.json ./packages/api-types/
COPY packages/schemas/package.json ./packages/schemas/
COPY packages/database/package.json ./packages/database/
COPY packages/ui/package.json ./packages/ui/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/

# Cache bun dependencies between builds
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --ignore-scripts

# --- Copy source files ---
COPY apps/api ./apps/api
COPY packages/schemas ./packages/schemas
COPY packages/database ./packages/database

# --- Build transpiled server.js ---
RUN cd apps/api && bun run build

# -----------------------------------------------------------------------------
# Runtime stage - Bun slim image
# -----------------------------------------------------------------------------
FROM --platform=linux/amd64 oven/bun:1.3.9-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy bundled JS and any remaining needs
COPY --from=build /app/apps/api/server.js ./server.js

# Copy drizzle migrations
COPY --from=build /app/apps/api/drizzle ./drizzle

# Define explicitly the permissions for bun user if required
USER bun

EXPOSE 3000

CMD ["bun", "run", "server.js"]
