
# -----------------------------------------------------------------------------
# Stage 1 — Install dependencies
# -----------------------------------------------------------------------------
FROM oven/bun:1-slim AS deps

WORKDIR /app

# Copy root manifests
COPY package.json bun.lock tsconfig.base.json ./

# Copy workspace manifests (bun lockfile expects all workspaces present)
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/schemas/package.json ./packages/schemas/
COPY packages/ui/package.json ./packages/ui/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/api-types/package.json ./packages/api-types/
COPY packages/typescript-config/package.json ./packages/typescript-config/

# Install build deps for server workspace only
RUN bun install --frozen-lockfile --filter @workspace/server


# -----------------------------------------------------------------------------
# Stage 2 — Install production dependencies (runtime only)
# -----------------------------------------------------------------------------
FROM oven/bun:1-slim AS prod-deps

WORKDIR /app

COPY package.json bun.lock ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/schemas/package.json ./packages/schemas/
COPY packages/ui/package.json ./packages/ui/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/api-types/package.json ./packages/api-types/
COPY packages/typescript-config/package.json ./packages/typescript-config/

RUN bun install --frozen-lockfile --no-save --production --filter @workspace/server


# -----------------------------------------------------------------------------
# Stage 3 — Build
# -----------------------------------------------------------------------------
FROM deps AS build

WORKDIR /app

# Copy source code
COPY apps/server ./apps/server
COPY packages/database ./packages/database
COPY packages/schemas ./packages/schemas

# Build server and emit a Node-runnable bundle entrypoint.
RUN cd apps/server && \
    bun run build && \
    bun build src/index.ts --target=node --format=esm --outfile bundle/index.js


# -----------------------------------------------------------------------------
# Stage 4 — Production runtime (small)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8000

# install curl for healthcheck
RUN apk add --no-cache curl

# copy runtime deps only
COPY --from=prod-deps /app/node_modules ./node_modules

# copy built server
COPY --from=build /app/apps/server/dist ./dist

# copy bundled runtime entrypoint (resolves TS path aliases and ESM specifiers)
COPY --from=build /app/apps/server/bundle ./bundle

# copy only required workspace packages
COPY --from=build /app/packages/database ./packages/database
COPY --from=build /app/packages/schemas ./packages/schemas

# copy package.json
COPY --from=build /app/apps/server/package.json ./package.json

# copy migrations
COPY --from=build /app/apps/server/drizzle ./drizzle

USER node

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
 CMD curl -f http://localhost:8000/health || exit 1

CMD ["node", "bundle/index.js"]
