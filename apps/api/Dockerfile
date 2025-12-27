FROM oven/bun:1 AS build

WORKDIR /app

# Cache install layer (monorepo-aware)
COPY package.json ./package.json
COPY tsconfig.base.json ./tsconfig.base.json

COPY apps/api/package.json ./apps/api/package.json
COPY packages/schemas/package.json ./packages/schemas/package.json

RUN bun install

# Copy source
COPY apps/api ./apps/api
COPY packages/schemas ./packages/schemas

ENV NODE_ENV=production

# Build a single portable binary (Elysia deploy guide)
# https://elysiajs.com/patterns/deploy.html
RUN bun --cwd apps/api run build:binary

FROM gcr.io/distroless/base

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/apps/api/server ./server

EXPOSE 3000

CMD ["./server"]


