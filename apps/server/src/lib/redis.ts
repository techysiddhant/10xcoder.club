import Redis from "ioredis";

import { env } from "@/config/env";
import { logger } from "@/lib/logger";

export const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
});

redis.on("connect", () => {
  logger.info("🟢 Redis connected");
});

redis.on("error", (err) => {
  logger.error({ err }, "🔴 Redis connection error");
});

export async function connectRedis(): Promise<void> {
  try {
    await redis.connect();
  } catch (err) {
    logger.error("❌ Failed to connect to Redis");
    logger.error(`   Host: ${env.REDIS_HOST}:${env.REDIS_PORT}`);
    if (err instanceof Error) {
      logger.error(`   Error: ${err.message}`);
    }
    logger.error(
      "📝 Please ensure Redis is running and check your .env configuration.",
    );
    process.exit(1);
  }
}
