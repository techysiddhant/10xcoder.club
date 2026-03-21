// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isDevelopment = process.env.NODE_ENV === "development";

if (dsn) {
  Sentry.init({
    dsn,
    integrations: [Sentry.replayIntegration()],
    tracesSampleRate: isDevelopment ? 1 : 0.1,
    enableLogs: isDevelopment,
    replaysSessionSampleRate: isDevelopment ? 1 : 0.1,
    replaysOnErrorSampleRate: 1.0,
    sendDefaultPii: isDevelopment,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
