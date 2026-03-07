// Sentry must be imported first for proper instrumentation
import "./lib/sentry";

import { serve } from "@hono/node-server";

import app from "@/app";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import { connectRedis } from "@/lib/redis";
import { initVoteSubscriber } from "@/lib/vote-subscriber";

// Connect Redis before starting server
try {
  await connectRedis();
} catch (err) {
  logger.error({ err }, "Failed to connect to Redis");
  throw err;
}

// Start email worker after Redis is connected
try {
  await import("@/lib/email-queue");
} catch (err) {
  logger.error({ err }, "Failed to initialize email queue worker");
  throw err;
}

// Start vote worker after Redis is connected
try {
  await import("@/lib/vote-worker");
} catch (err) {
  logger.error({ err }, "Failed to initialize vote sync worker");
  throw err;
}

// Initialize vote subscriber for SSE
try {
  await initVoteSubscriber();
} catch (err) {
  logger.error({ err }, "Failed to initialize vote subscriber");
  throw err;
}

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    logger.info(`🚀 Server is running on http://localhost:${info.port}`);
  },
);
