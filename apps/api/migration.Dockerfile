FROM oven/bun:1.1.43-alpine

WORKDIR /app

# Required for pg_isready
RUN apk add --no-cache postgresql-client

# Copy migration inputs
COPY apps/api/src/db ./src/db
COPY apps/api/drizzle ./drizzle
COPY apps/api/tsconfig.json ./tsconfig.json

# Minimal pinned deps
RUN echo '{
  "name": "migration",
  "type": "module",
  "dependencies": {
    "drizzle-kit": "0.31.8",
    "drizzle-orm": "0.45.1",
    "postgres": "3.4.7"
  }
}' > package.json

# Install prod-only deps
RUN bun install --production --no-save

# Create drizzle config safely
RUN mkdir -p src && cat <<'EOF' > src/drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

const {
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_DB,
  POSTGRES_HOST,
  POSTGRES_PORT = '5432',
} = process.env

if (!POSTGRES_USER || !POSTGRES_PASSWORD || !POSTGRES_DB || !POSTGRES_HOST) {
  throw new Error('Missing Postgres environment variables')
}

const DATABASE_URL =
  `postgres://${POSTGRES_USER}:${encodeURIComponent(POSTGRES_PASSWORD)}` +
  `@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`

export default defineConfig({
  schema: './src/db/schema',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: DATABASE_URL,
  },
})
EOF

ENV NODE_ENV=production

CMD ["bunx", "drizzle-kit", "migrate", "--config=src/drizzle.config.ts"]
