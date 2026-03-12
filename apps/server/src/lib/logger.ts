import pino from "pino";
import type { Logger } from "pino";
import { createWriteStream } from "pino-logflare";

import { env, isProduction } from "@/config/env";

/**
 * Application logger using Pino.
 *
 * - Any env with complete Logflare config: pino-logflare transport
 * - Development without Logflare: pino-pretty (colorized console output)
 * - Otherwise: plain JSON to stdout
 */
function createLogger(): Logger {
  const baseConfig: pino.LoggerOptions = {
    level: env.LOG_LEVEL,
    base: {
      env: env.NODE_ENV,
      service: "server",
    },
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
    },
  };

  const hasLogflareApiKey = Boolean(env.LOGFLARE_API_KEY);
  const hasLogflareSourceId = Boolean(env.LOGFLARE_SOURCE_ID);
  const hasCompleteLogflareConfig = hasLogflareApiKey && hasLogflareSourceId;

  // Prefer Logflare whenever fully configured so it can be debugged in development too.
  if (hasCompleteLogflareConfig) {
    try {
      const logflareStream = createWriteStream({
        apiKey: env.LOGFLARE_API_KEY!,
        sourceToken: env.LOGFLARE_SOURCE_ID!,
      });

      return pino(
        baseConfig,
        pino.multistream([
          { stream: process.stdout },
          { stream: logflareStream },
        ]),
      );
    } catch (error) {
      // Keep the app booting if Logflare stream setup fails in bundled/runtime environments.
      console.warn(
        "⚠️ Logflare stream unavailable, falling back to local logs only.",
        error,
      );
    }
  }

  if (hasLogflareApiKey !== hasLogflareSourceId) {
    console.warn(
      "⚠️ Incomplete Logflare config: both LOGFLARE_API_KEY and LOGFLARE_SOURCE_ID are required. Falling back to stdout JSON logs.",
    );
  }

  // Development without Logflare: pretty print
  if (!isProduction) {
    return pino({
      ...baseConfig,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:mm:ss",
          ignore: "pid,hostname",
        },
      },
    });
  }

  // Production without Logflare: plain JSON to stdout
  return pino(baseConfig);
}

export const logger: Logger = createLogger();

/** Create a child logger with request context */
export const createRequestLogger = (
  requestId: string,
  extra?: Record<string, unknown>,
): Logger => {
  return logger.child({ ...extra, requestId });
};
