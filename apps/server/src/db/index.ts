import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "@workspace/database";

import { env } from "@/config/env";
import { logger } from "@/lib/logger";

const connectionString = env.DATABASE_URL
  ? env.DATABASE_URL
  : `postgresql://${encodeURIComponent(env.POSTGRES_USER || "")}:${encodeURIComponent(env.POSTGRES_PASSWORD || "")}@${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${env.POSTGRES_DB}`;

const client = postgres(connectionString);

export const db = drizzle(client, { schema });

export async function runMigrations() {
  logger.info("⏳ Running database migrations...");
  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    logger.info("✅ Database migrations completed successfully");
  } catch (error) {
    logger.error({ error }, "❌ Database migrations failed");
    throw error;
  }
}
