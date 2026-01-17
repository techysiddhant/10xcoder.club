# Database Migration Runner
#
# This Dockerfile creates a lightweight container specifically for running
# Drizzle database migrations. It's used in CI/CD pipelines to apply 
# migrations before deploying the main application.
#
# Usage:
#   docker build -f apps/api/migration.Dockerfile -t 10xcoder-migration .
#   docker run --rm --network <network> -e DATABASE_URL=<url> 10xcoder-migration

FROM oven/bun:1.1.43-alpine

WORKDIR /app

# Install required packages
RUN apk add --no-cache postgresql-client

# Copy only the files needed for migrations
COPY apps/api/src/db ./src/db
COPY apps/api/drizzle ./drizzle
COPY apps/api/tsconfig.json ./tsconfig.json

# Create a minimal package.json with pinned versions matching apps/api/package.json
# drizzle-kit: ^0.31.8, drizzle-orm: ^0.45.1, postgres: ^3.4.7
RUN echo '{"name":"migration","type":"module","dependencies":{"drizzle-kit":"^0.31.8","drizzle-orm":"^0.45.1","postgres":"^3.4.7"}}' > package.json

# Install dependencies with Bun
RUN bun install

# Create a simplified drizzle config that uses DATABASE_URL directly
COPY <<EOF ./src/drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

export default defineConfig({
  schema: './src/db/schema',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL
  }
})
EOF

# Set environment
ENV NODE_ENV=production

# Default command runs migrations using bunx
CMD ["bunx", "drizzle-kit", "migrate", "--config=src/drizzle.config.ts"]
