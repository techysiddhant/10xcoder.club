# =============================================================================
# 10xcoder.club API Dockerfile - Production Ready for AWS EC2
# =============================================================================
# Build from monorepo root: docker build -f apps/api/Dockerfile .
# =============================================================================

# -----------------------------------------------------------------------------
# Build stage - Debian with Bun
# -----------------------------------------------------------------------------
FROM --platform=linux/amd64 oven/bun:1.1.43-debian AS build

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

# --- Copy source files ---
COPY apps/api ./apps/api
COPY packages/schemas ./packages/schemas

# --- Build compiled binary for linux/amd64 (glibc) ---
RUN cd apps/api && bun build \
    --compile \
    --minify-whitespace \
    --minify-syntax \
    --target bun-linux-x64 \
    --outfile server \
    src/index.ts

# -----------------------------------------------------------------------------
# Runtime stage - Distroless (minimal, secure, ~20MB)
# -----------------------------------------------------------------------------
FROM --platform=linux/amd64 gcr.io/distroless/base-debian12:nonroot AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy compiled binary from build stage
COPY --from=build /app/apps/api/server ./server

# Copy drizzle migrations
COPY --from=build /app/apps/api/drizzle ./drizzle

EXPOSE 3000

# Distroless runs as nonroot user (UID 65532) by default
CMD ["./server"]
