import { Worker, Job } from 'bullmq'
import { db } from '@/db'
import { resource, userVote } from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { env } from '@/config/env'
import { QUEUE_NAMES } from '@/lib/queue'
import { logger } from '@/lib/logger'

interface VoteJobData {
  resourceId: string
  userId: string
  type: 'upvote' | 'downvote'
  action: 'add' | 'remove' | 'switch'
  fromType?: 'upvote' | 'downvote' | null
}

// BullMQ connection config
const connection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined
}

// Create worker logger
const workerLogger = logger.child({ worker: 'vote-sync' })

// Create worker
const worker = new Worker<VoteJobData>(
  QUEUE_NAMES.UPVOTE_SYNC,
  async (job: Job<VoteJobData>) => {
    const { resourceId, userId, type, action, fromType } = job.data
    const jobLogger = workerLogger.child({ jobId: job.id, resourceId, userId, type, action })

    jobLogger.info('Processing vote job')

    try {
      if (action === 'add') {
        // Use transaction to ensure insert and increment are atomic
        await db.transaction(async (tx) => {
          // Insert vote record and check if it was inserted
          const insertResult = await tx
            .insert(userVote)
            .values({ resourceId, userId, type })
            .onConflictDoNothing()
            .returning({ id: userVote.id })

          // Only increment counter if a vote was actually inserted
          if (insertResult.length > 0) {
            if (type === 'upvote') {
              await tx
                .update(resource)
                .set({ upvoteCount: sql`${resource.upvoteCount} + 1` })
                .where(eq(resource.id, resourceId))
            } else {
              await tx
                .update(resource)
                .set({ downvoteCount: sql`${resource.downvoteCount} + 1` })
                .where(eq(resource.id, resourceId))
            }
          } else {
            jobLogger.warn('Vote already exists, skipping counter increment')
          }
        })
      } else if (action === 'remove') {
        // Use transaction to ensure delete and decrement are atomic
        await db.transaction(async (tx) => {
          // Delete vote record only if it matches the expected type
          const deleteResult = await tx
            .delete(userVote)
            .where(
              and(
                eq(userVote.resourceId, resourceId),
                eq(userVote.userId, userId),
                eq(userVote.type, type)
              )
            )
            .returning({ id: userVote.id })

          // Only decrement counter if a vote was actually deleted
          if (deleteResult.length > 0) {
            if (type === 'upvote') {
              await tx
                .update(resource)
                .set({ upvoteCount: sql`GREATEST(${resource.upvoteCount} - 1, 0)` })
                .where(eq(resource.id, resourceId))
            } else {
              await tx
                .update(resource)
                .set({ downvoteCount: sql`GREATEST(${resource.downvoteCount} - 1, 0)` })
                .where(eq(resource.id, resourceId))
            }
          } else {
            jobLogger.warn('No vote found to delete, skipping counter decrement')
          }
        })
      } else if (action === 'switch') {
        if (!fromType || fromType === type) {
          jobLogger.warn(
            { fromType, type },
            'Invalid switch: fromType missing or same as target type'
          )
          return
        }

        await db.transaction(async (tx) => {
          // Update vote type, ensuring it currently matches fromType
          const updateResult = await tx
            .update(userVote)
            .set({ type })
            .where(
              and(
                eq(userVote.resourceId, resourceId),
                eq(userVote.userId, userId),
                eq(userVote.type, fromType)
              )
            )
            .returning({ id: userVote.id })

          // Only update counters if a vote was actually updated
          if (updateResult.length > 0) {
            if (type === 'upvote') {
              // Switched from downvote to upvote
              await tx
                .update(resource)
                .set({
                  upvoteCount: sql`${resource.upvoteCount} + 1`,
                  downvoteCount: sql`GREATEST(${resource.downvoteCount} - 1, 0)`
                })
                .where(eq(resource.id, resourceId))
            } else {
              // Switched from upvote to downvote
              await tx
                .update(resource)
                .set({
                  upvoteCount: sql`GREATEST(${resource.upvoteCount} - 1, 0)`,
                  downvoteCount: sql`${resource.downvoteCount} + 1`
                })
                .where(eq(resource.id, resourceId))
            }
          } else {
            jobLogger.warn('Vote not found or type mismatch, skipping counter update')
          }
        })
      }

      jobLogger.info('Vote job completed successfully')
    } catch (error) {
      jobLogger.error({ error }, 'Vote job failed')
      throw error // Will trigger retry
    }
  },
  {
    connection,
    concurrency: 10
  }
)

// Worker event handlers
worker.on('completed', (job) => {
  workerLogger.debug({ jobId: job.id }, 'Job completed')
})

worker.on('failed', (job, err) => {
  workerLogger.error({ jobId: job?.id, error: err.message }, 'Job failed')
})

worker.on('error', (err) => {
  workerLogger.error({ error: err }, 'Worker error')
})

workerLogger.info('Vote worker started')

export { worker }
