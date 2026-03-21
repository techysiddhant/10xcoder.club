// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
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
