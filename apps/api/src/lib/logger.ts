import pino from 'pino'
import type { Logger } from 'pino'
import { env } from '@/config/env'

// Determine log level
const level = env.LOG_LEVEL ?? (env.NODE_ENV === 'production' ? 'info' : 'debug')

// Create base logger
export const logger: Logger = pino({
  level,
  // Pretty print in development, JSON in production
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:mm:ss',
            ignore: 'pid,hostname'
          }
        }
      : undefined,
  // Base fields included in every log
  base: {
    env: env.NODE_ENV,
    service: 'api'
  },
  // Customize serializers
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err
  }
})

// Create a child logger with request context
export const createRequestLogger = (requestId: string, userId?: string): Logger => {
  return logger.child({
    requestId,
    ...(userId && { userId })
  })
}
