// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isProduction = process.env.NODE_ENV === "production";
const sendDefaultPii = !isProduction || process.env.SENTRY_SEND_PII === "true";

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: isProduction ? 0.1 : 1,
    enableLogs: true,
    sendDefaultPii,
  });
}
