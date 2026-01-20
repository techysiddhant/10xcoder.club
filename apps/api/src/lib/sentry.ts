/**
 * Sentry SDK initialization for error tracking and performance monitoring.
 * Must be imported FIRST before any other modules in the application.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/bun/
 */
import * as Sentry from '@sentry/bun'

const SENTRY_DSN = process.env.SENTRY_DSN

// Only initialize if DSN is provided
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',

    // Performance Monitoring
    // Sample 10% of transactions in production for cost efficiency
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Capture 100% of error events
    sampleRate: 1.0,

    // Integrations for enhanced monitoring
    integrations: [
      // Capture unhandled promise rejections
      Sentry.onUnhandledRejectionIntegration(),
      // Capture database queries (postgres)
      Sentry.postgresIntegration()
    ],

    // Filter sensitive data from being sent to Sentry
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization']
        delete event.request.headers['cookie']
        delete event.request.headers['x-api-key']
      }
      return event
    },

    // Add release version for tracking deployments
    release: process.env.npm_package_version ?? '1.0.0'
  })

  console.log('🔍 Sentry initialized for error tracking and performance monitoring')
} else if (process.env.NODE_ENV === 'production') {
  console.warn('⚠️ SENTRY_DSN not configured - error tracking is disabled')
}

export { Sentry }
