/**
 * Sentry SDK initialization for error tracking and performance monitoring.
 * Must be imported FIRST before any other modules in the application.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/bun/
 */
import * as Sentry from "@sentry/bun";

const SENTRY_DSN = process.env.SENTRY_DSN;

// Only initialize if DSN is provided
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",

    // Performance Monitoring
    // Sample 10% of transactions in production for cost efficiency
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Capture 100% of error events
    sampleRate: 1.0,

    // IMPORTANT: Disable default integrations to avoid "Cannot replace module
    // namespace object's binding" error in Bun compiled binaries.
    // Default integrations try to patch/wrap module exports which fails because
    // ES module namespace objects are frozen in Bun's compiled binary.
    defaultIntegrations: false,

    // Only use integrations that don't require module patching
    integrations: [
      Sentry.inboundFiltersIntegration(),
      Sentry.functionToStringIntegration(),
      Sentry.linkedErrorsIntegration(),
      Sentry.dedupeIntegration(),
    ],

    // Filter sensitive data from being sent to Sentry
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
        delete event.request.headers["x-api-key"];
      }
      return event;
    },

    // Add release version for tracking deployments
    release: process.env.npm_package_version ?? "1.0.0",
  });

  console.log("🔍 Sentry initialized for error tracking");
} else if (process.env.NODE_ENV === "production") {
  console.warn("⚠️ SENTRY_DSN not configured - error tracking is disabled");
}

export { Sentry };
