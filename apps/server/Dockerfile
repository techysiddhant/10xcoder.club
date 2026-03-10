# syntax=docker/dockerfile:1

# =============================================================================
# 10xcoder.club Server — Optimized Production Dockerfile
# =============================================================================
# Build from monorepo root:
# docker build -f apps/server/Dockerfile .
# =============================================================================


# -----------------------------------------------------------------------------
# Stage 1 — Install dependencies (cached)
# -----------------------------------------------------------------------------
FROM --platform=linux/amd64 oven/bun:1-slim AS deps

WORKDIR /app

# Copy root files
COPY package.json bun.lock tsconfig.base.json ./

# Copy workspace package.json files only (for caching)
COPY apps/server/package.json ./apps/server/
COPY packages/schemas/package.json ./packages/schemas/
COPY packages/database/package.json ./packages/database/

# Install dependencies with cache
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile


# -----------------------------------------------------------------------------
# Stage 2 — Build server
# -----------------------------------------------------------------------------
FROM deps AS build

WORKDIR /app

# Copy full source now (after deps installed)
COPY apps ./apps
COPY packages ./packages

# Build server
RUN cd apps/server && bun run build

# Debug check (safe to keep)
RUN ls -R apps/server/dist


# -----------------------------------------------------------------------------
# Stage 3 — Production runtime
# -----------------------------------------------------------------------------
FROM --platform=linux/amd64 node:20-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8000

# Install curl for healthcheck
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Copy production node_modules
COPY --from=deps /app/node_modules ./node_modules

# Copy built server
COPY --from=build /app/apps/server/dist ./dist

# Copy runtime dependencies from workspace packages
COPY --from=build /app/packages ./packages

# Copy server package.json
COPY --from=build /app/apps/server/package.json ./package.json

# Copy drizzle migrations
COPY --from=build /app/apps/server/drizzle ./drizzle

# Run as non-root
USER node

EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["node", "dist/apps/server/src/index.js"]