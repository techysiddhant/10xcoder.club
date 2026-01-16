import { Elysia } from 'elysia'
import { createRequestLogger, logger } from '@/lib/logger'
import type { Logger } from 'pino'

// Request context with logging
export const loggingMiddleware = new Elysia({ name: 'logging-middleware' })
  .derive(({ request, store }) => {
    // Generate or extract request ID
    const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID()

    // Create request-scoped logger
    const log = createRequestLogger(requestId)

    // Start time for duration calculation
    const startTime = Date.now()

    // Log request start
    const url = new URL(request.url)
    log.info(
      {
        method: request.method,
        path: url.pathname,
        query: url.search || undefined
      },
      'Request started'
    )

    return {
      requestId,
      log,
      startTime
    }
  })
  .onAfterResponse(({ request, requestId, log, startTime, set }) => {
    const url = new URL(request.url)
    const duration = Date.now() - startTime
    const status = typeof set.status === 'number' ? set.status : 200

    const logMethod = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'

    log[logMethod](
      {
        method: request.method,
        path: url.pathname,
        status,
        duration
      },
      'Request completed'
    )
  })
  .onError(({ error, request, log }) => {
    const url = new URL(request.url)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    log?.error(
      {
        method: request.method,
        path: url.pathname,
        error: errorMessage,
        stack: errorStack
      },
      'Request error'
    )
  })
  .as('global')

// Export logger type for use in handlers
export type RequestContext = {
  requestId: string
  log: Logger
  startTime: number
}
