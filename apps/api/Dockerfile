# =============================================================================
# 10xcoder.club API Server Dockerfile
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1 — Build
# -----------------------------------------------------------------------------
    FROM --platform=linux/amd64 oven/bun:1.1.43 AS build

    WORKDIR /app
    
    # ---- Bun memory safety (CRITICAL for free tier) ----
    ENV NODE_ENV=production
    ENV BUN_MAX_CONCURRENCY=2
    ENV BUN_MAX_HTTP_CONNECTIONS=2
    ENV BUN_INSTALL_OPTIONAL=false
    
    # ---- Dependency cache layer (monorepo-aware) ----
    COPY package.json bun.lock tsconfig.base.json ./
    
    # Apps
    COPY apps/api/package.json apps/api/tsconfig.json ./apps/api/
    COPY apps/web/package.json ./apps/web/
    
    # Packages
    COPY packages/schemas/package.json ./packages/schemas/
    COPY packages/ui/package.json ./packages/ui/
    COPY packages/eslint-config/package.json ./packages/eslint-config/
    COPY packages/typescript-config/package.json ./packages/typescript-config/
    
    # Install dependencies (peak memory happens here)
    RUN bun install --frozen-lockfile --no-progress
    
    # ---- Copy source AFTER deps ----
    COPY apps/api ./apps/api
    COPY packages/schemas ./packages/schemas
    
    # ---- Build single binary ----
    RUN cd apps/api && bun run build:binary
    
    # -----------------------------------------------------------------------------
    # Stage 2 — Runtime (minimal, production)
    # -----------------------------------------------------------------------------
    FROM --platform=linux/amd64 alpine:3.19
    
    LABEL org.opencontainers.image.source="https://github.com/techysiddhant/10xcoder.club"
    LABEL org.opencontainers.image.description="10xcoder.club API Server"
    LABEL org.opencontainers.image.licenses="MIT"
    LABEL org.opencontainers.image.vendor="10xcoder.club"
    
    WORKDIR /app
    
    # Runtime deps (healthchecks, TLS)
    RUN apk add --no-cache ca-certificates wget
    
    ENV NODE_ENV=production
    ENV PORT=3000
    
    # Copy compiled binary
    COPY --from=build /app/apps/api/server ./server
    
    # Copy migrations (runtime usage)
    COPY --from=build /app/apps/api/drizzle ./drizzle
    
    RUN chmod +x ./server
    
    EXPOSE 3000
    
    CMD ["./server"]
    