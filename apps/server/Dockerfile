# syntax=docker/dockerfile:1

# =============================================================================
# 10xcoder.club Server — Optimized Production Dockerfile
# =============================================================================


# -----------------------------------------------------------------------------
# Stage 1 — Dependencies
# -----------------------------------------------------------------------------
  FROM oven/bun:1-slim AS deps

  WORKDIR /app
  
  # Copy lock + package.json first for caching
  COPY package.json bun.lock tsconfig.base.json ./
  
  # Copy workspace manifests only
  COPY apps ./apps
  COPY packages ./packages
  
  # Remove source files to keep layer small
  RUN find apps -mindepth 2 ! -name "package.json" -delete
  RUN find packages -mindepth 2 ! -name "package.json" -delete
  
  # Install dependencies
  RUN --mount=type=cache,target=/root/.bun/install/cache \
      bun install --frozen-lockfile
  
  
  
  # -----------------------------------------------------------------------------
  # Stage 2 — Build
  # -----------------------------------------------------------------------------
  FROM deps AS build
  
  WORKDIR /app
  
  # Copy full source code
  COPY apps ./apps
  COPY packages ./packages
  
  # Build server
  RUN cd apps/server && bun run build
  
  # Debug (optional)
  RUN ls -R apps/server/dist
  
  
  
  # -----------------------------------------------------------------------------
  # Stage 3 — Production Runtime
  # -----------------------------------------------------------------------------
  FROM node:20-slim AS runtime
  
  WORKDIR /app
  
  ENV NODE_ENV=production
  ENV PORT=8000
  
  # install curl for healthchecks
  RUN apt-get update \
   && apt-get install -y --no-install-recommends curl \
   && rm -rf /var/lib/apt/lists/*
  
  # Copy runtime dependencies
  COPY --from=deps /app/node_modules ./node_modules
  
  # Copy built server
  COPY --from=build /app/apps/server/dist ./dist
  
  # Copy workspace packages
  COPY --from=build /app/packages ./packages
  
  # Copy server package.json
  COPY --from=build /app/apps/server/package.json ./package.json
  
  # Copy migrations
  COPY --from=build /app/apps/server/drizzle ./drizzle
  
  USER node
  
  EXPOSE 8000
  
  HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1
  
  CMD ["node", "dist/apps/server/src/index.js"]