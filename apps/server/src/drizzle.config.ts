import { defineConfig } from "drizzle-kit";

import { env } from "./config/env";

export default defineConfig({
  schema: "../../packages/database/src/schema",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: `postgresql://${encodeURIComponent(env.POSTGRES_USER)}:${encodeURIComponent(env.POSTGRES_PASSWORD)}@${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${env.POSTGRES_DB}`,
  },
});
