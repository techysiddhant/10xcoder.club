FROM --platform=linux/amd64 oven/bun:1.1.43 AS build

WORKDIR /app

# Cache install layer (monorepo-aware)
# Copy all package.json files to ensure lockfile integrity
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

RUN bun install --frozen-lockfile

# Copy source
COPY apps/api ./apps/api
COPY packages/schemas ./packages/schemas

ENV NODE_ENV=production

# Build a single portable binary (Elysia deploy guide)
# https://elysiajs.com/patterns/deploy.html
RUN bun --cwd apps/api run build:binary

# Production image
FROM --platform=linux/amd64 gcr.io/distroless/base

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/apps/api/server.js ./server

# Copy drizzle migrations for runtime migrations
COPY --from=build /app/apps/api/drizzle ./drizzle

EXPOSE 3000

CMD ["./server"]
