import pino from "pino";
import type { Logger } from "pino";

import { env, isProduction } from "@/config/env";

/**
 * Application logger using Pino.
 *
 * - Development: pino-pretty (colorized console output)
 * - Production with Logflare keys: pino-logflare transport (ships logs to Logflare)
 * - Production without keys: plain JSON to stdout
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

  // Development: pretty print
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

  // Production with Logflare
  if (env.LOGFLARE_API_KEY && env.LOGFLARE_SOURCE_ID) {
    return pino({
      ...baseConfig,
      transport: {
        target: "pino-logflare",
        options: {
          apiKey: env.LOGFLARE_API_KEY,
          sourceToken: env.LOGFLARE_SOURCE_ID,
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
