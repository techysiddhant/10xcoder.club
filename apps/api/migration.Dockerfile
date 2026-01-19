FROM oven/bun:1.1.43-alpine

WORKDIR /app

# Required tools
RUN apk add --no-cache postgresql-client

# Copy only what migrations need
COPY apps/api/src/db ./src/db
COPY apps/api/drizzle ./drizzle
COPY apps/api/tsconfig.json ./tsconfig.json

# Create minimal package.json safely
RUN cat <<'EOF' > package.json
{
  "name": "migration",
  "type": "module",
  "dependencies": {
    "drizzle-kit": "0.31.8",
    "drizzle-orm": "0.45.1",
    "postgres": "3.4.7"
  }
}
EOF

# Install deps
RUN bun install --no-save

# Drizzle config
RUN cat <<'EOF' > src/drizzle.config.ts
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

export default defineConfig({
  schema: "./src/db/schema",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL
  }
});
EOF

ENV NODE_ENV=production

CMD ["bunx", "drizzle-kit", "migrate", "--config=src/drizzle.config.ts"]
