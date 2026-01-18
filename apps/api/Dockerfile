# =============================================================================
# 10xcoder.club API Dockerfile
# =============================================================================
# Build from monorepo root: docker build -f apps/api/Dockerfile .
# =============================================================================

# -----------------------------------------------------------------------------
# Build stage
# -----------------------------------------------------------------------------
FROM --platform=linux/amd64 oven/bun:1.1.43-alpine AS build

WORKDIR /app

ENV NODE_ENV=production

# --- Install deps (monorepo-aware) ---
COPY package.json bun.lock tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/schemas/package.json ./packages/schemas/
COPY packages/ui/package.json ./packages/ui/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/

RUN bun install --frozen-lockfile --ignore-scripts

# --- Copy source ---
COPY apps/api ./apps/api
COPY packages/schemas ./packages/schemas

# --- Build compiled binary for linux/amd64 ---
RUN cd apps/api && bun build \
    --compile \
    --minify-whitespace \
    --minify-syntax \
    --target bun-linux-x64 \
    --outfile server \
    src/index.ts

# -----------------------------------------------------------------------------
# Runtime stage (Debian for glibc compatibility)
# -----------------------------------------------------------------------------
FROM --platform=linux/amd64 debian:bookworm-slim AS release

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install minimal runtime deps (for healthchecks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Copy compiled binary (self-contained, no node_modules needed)
COPY --from=build /app/apps/api/server ./server
RUN chmod +x ./server

# Copy drizzle migrations
COPY --from=build /app/apps/api/drizzle ./drizzle

EXPOSE 3000

CMD ["./server"]
