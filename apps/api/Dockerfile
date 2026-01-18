# =============================================================================
# 10xcoder.club API – FINAL SAFE DOCKERFILE
# =============================================================================

# -----------------------------------------------------------------------------
# Build stage
# -----------------------------------------------------------------------------
    FROM oven/bun:1.1.43-alpine AS build

    WORKDIR /app
    
    ENV NODE_ENV=production
    
    # --- Install deps (monorepo-aware) ---
    COPY package.json bun.lock tsconfig.base.json ./
    
    COPY apps/api/package.json ./apps/api/package.json
    COPY packages/schemas/package.json ./packages/schemas/package.json
    
    RUN bun install --frozen-lockfile
    
    # --- Copy source ---
    COPY apps/api ./apps/api
    COPY packages/schemas ./packages/schemas
    
    # --- Build (outputs server.js at apps/api/server.js) ---
    RUN cd apps/api && bun run build
    
    # -----------------------------------------------------------------------------
    # Runtime stage
    # -----------------------------------------------------------------------------
    FROM oven/bun:1.1.43-alpine AS runtime
    
    WORKDIR /app
    
    ENV NODE_ENV=production
    ENV PORT=3000
    
    # Needed for HTTPS + healthchecks
    RUN apk add --no-cache ca-certificates wget
    
    # --- Copy runtime deps ---
    COPY --from=build /app/node_modules ./node_modules
    
    # --- Copy built output (server.js at ROOT) ---
    COPY --from=build /app/apps/api/server.js ./server.js
    
    # --- Copy migrations if needed ---
    COPY --from=build /app/apps/api/drizzle ./drizzle
    
    EXPOSE 3000
    
    CMD ["bun", "server.js"]
    