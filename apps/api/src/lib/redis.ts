import Redis from 'ioredis'
import { env } from '@/config/env'

export const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: true
})

redis.on('connect', () => {
  console.log('🟢 Redis connected')
})

redis.on('error', (err) => {
  console.error('🔴 Redis connection error:', err.message)
})

export async function connectRedis(): Promise<void> {
  try {
    await redis.connect()
  } catch (err) {
    console.error('❌ Failed to connect to Redis')
    console.error(`   Host: ${env.REDIS_HOST}:${env.REDIS_PORT}`)
    if (err instanceof Error) {
      console.error(`   Error: ${err.message}`)
    }
    console.error('\n📝 Please ensure Redis is running and check your .env configuration.')
    process.exit(1)
  }
}
