# syntax=docker/dockerfile:1

# =============================================================================
# 10xcoder.club Server — Production Dockerfile
# =============================================================================
# Build from monorepo root: docker build -f apps/server/Dockerfile .
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Install dependencies with Bun
# -----------------------------------------------------------------------------
FROM --platform=linux/amd64 oven/bun:1-slim AS deps

WORKDIR /app

# NODE_ENV is NOT set to production here so devDependencies (typescript, etc.) are installed

# Copy workspace root files
COPY package.json bun.lock tsconfig.base.json ./

# Copy all workspace package.json files for dependency resolution
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY packages/api-types/package.json ./packages/api-types/
COPY packages/schemas/package.json ./packages/schemas/
COPY packages/database/package.json ./packages/database/
COPY packages/ui/package.json ./packages/ui/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/

# Cache bun dependencies between builds (NODE_ENV unset to include devDeps for build)
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --ignore-scripts

# -----------------------------------------------------------------------------
# Stage 2: Build TypeScript project
# -----------------------------------------------------------------------------
FROM deps AS build

WORKDIR /app

# Copy source files
COPY apps/server ./apps/server
COPY packages/schemas ./packages/schemas
COPY packages/database ./packages/database

# Build with tsc
RUN cd apps/server && bun run build

# -----------------------------------------------------------------------------
# Stage 3: Production runtime with Node.js
# -----------------------------------------------------------------------------
FROM --platform=linux/amd64 node:20-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8000

# Copy compiled output
COPY --from=build /app/apps/server/dist ./dist

# Copy drizzle migrations (needed at runtime for db:push / reference)
COPY --from=build /app/apps/server/drizzle ./drizzle

# Copy production node_modules (includes workspace deps)
COPY --from=deps /app/node_modules ./node_modules
# Copy workspace packages with compiled source from build stage
COPY --from=build /app/packages ./packages

# Copy package.json for Node.js module resolution
COPY --from=build /app/apps/server/package.json ./package.json

# Run as non-root user
USER node

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["node", "dist/index.js"]
