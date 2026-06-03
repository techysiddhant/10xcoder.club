import Redis from "ioredis";

import { env } from "@/config/env";
import { logger } from "@/lib/logger";

function parseRedisUrl(redisUrl: string) {
  try {
    const url = new URL(redisUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port || "6379", 10),
      username: url.username ? decodeURIComponent(url.username) : undefined,
      password: url.password ? decodeURIComponent(url.password) : undefined,
      tls: url.protocol === "rediss:" ? {} : undefined,
    };
  } catch (error) {
    logger.error({ error, redisUrl }, "Failed to parse REDIS_URL");
    throw error;
  }
}

export const redisConnectionOptions = env.REDIS_URL
  ? parseRedisUrl(env.REDIS_URL)
  : {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD || undefined,
    };

export const redis = new Redis({
  ...redisConnectionOptions,
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
    logger.error(
      `   Host: ${env.REDIS_URL ? "[REDIS_URL]" : `${env.REDIS_HOST}:${env.REDIS_PORT}`}`,
    );
    if (err instanceof Error) {
      logger.error(`   Error: ${err.message}`);
    }
    logger.error(
      "📝 Please ensure Redis is running and check your .env configuration.",
    );
    process.exit(1);
  }
}
