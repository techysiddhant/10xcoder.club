import { defineConfig } from "drizzle-kit";

import { env } from "@/config/env";

const connectionString =
  env.DATABASE_URL ||
  `postgresql://${encodeURIComponent(env.POSTGRES_USER || "")}:${encodeURIComponent(env.POSTGRES_PASSWORD || "")}@${env.POSTGRES_HOST || ""}:${env.POSTGRES_PORT}/${env.POSTGRES_DB || ""}`;

export default defineConfig({
  schema: "../../packages/database/src/schema",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
