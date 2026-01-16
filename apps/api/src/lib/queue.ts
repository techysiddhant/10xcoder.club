import { Queue } from 'bullmq'
import { env } from '@/config/env'

// BullMQ connection config (separate from ioredis instance)
const connection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined
}

// BullMQ Queues
export const upvoteQueue = new Queue('upvote-sync', {
  connection,
  defaultJobOptions: {
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 1000, // Keep last 1000 failed jobs
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    }
  }
})

// Queue names constant
export const QUEUE_NAMES = {
  UPVOTE_SYNC: 'upvote-sync'
} as const
