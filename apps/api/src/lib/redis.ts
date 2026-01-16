import Redis from 'ioredis'
import { env } from '@/config/env'
import { logger } from '@/lib/logger'

// Redis logger
const redisLogger = logger.child({ component: 'redis' })

export const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true
})

redis.on('connect', () => {
  redisLogger.info({ host: env.REDIS_HOST, port: env.REDIS_PORT }, 'Redis connected')
})

redis.on('error', (err) => {
  redisLogger.error({ error: err.message }, 'Redis connection error')
})

redis.on('reconnecting', () => {
  redisLogger.warn('Redis reconnecting')
})

export async function connectRedis(): Promise<void> {
  try {
    await redis.connect()
  } catch (err) {
    redisLogger.fatal(
      {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        error: err instanceof Error ? err.message : String(err)
      },
      'Failed to connect to Redis'
    )
    process.exit(1)
  }
}
