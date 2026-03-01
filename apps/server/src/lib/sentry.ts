/**
 * Sentry SDK initialization for error tracking and performance monitoring.
 * Must be imported FIRST before any other modules in the application entry point.
 *
 * Only activates in production when SENTRY_DSN is set.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/node/
 */
import * as Sentry from "@sentry/node";

import { env, isProduction } from "@/config/env";

if (isProduction && env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,

    // Performance Monitoring — 10% in production
    tracesSampleRate: 0.1,

    // Capture 100% of error events
    sampleRate: 1.0,

    integrations: [Sentry.httpIntegration()],

    // Filter sensitive data
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
      }
      return event;
    },

    release: process.env.npm_package_version ?? "1.0.0",
  });

  console.log("🔍 Sentry initialized for error tracking");
} else if (isProduction) {
  console.warn("⚠️ SENTRY_DSN not configured — error tracking is disabled");
}

export { Sentry };
