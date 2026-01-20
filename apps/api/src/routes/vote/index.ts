import { Elysia, t } from 'elysia'
import { authMiddleware } from '@/middleware/auth.middleware'
import { upvote, downvote } from '@/controllers/vote.controller'
import { ErrorResponseSchema, errorResponse } from '@/utils/errors'
import Redis from 'ioredis'
import { env } from '@/config/env'
import { REDIS_KEY } from '@/constant'
import { getVoteCounts, checkResourceExists } from '@/services/vote.service'

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Vote response schema
const VoteResponseSchema = t.Object({
  status: t.Number({ example: 200 }),
  userVote: t.Union([t.Literal('upvote'), t.Literal('downvote'), t.Null()]),
  upvotes: t.Number(),
  downvotes: t.Number()
})

export const voteRoutes = new Elysia({ prefix: '/api/vote' })
  .use(authMiddleware)

  // ==========================================
  // POST /api/vote/:resourceId/upvote - Toggle upvote
  // ==========================================
  .post('/:resourceId/upvote', upvote, {
    params: t.Object({
      resourceId: t.String({ minLength: 1 })
    }),
    auth: true,
    detail: {
      tags: ['Votes'],
      summary: 'Toggle upvote',
      description:
        'Toggle upvote for a resource. If already upvoted, removes it. If downvoted, switches to upvote.'
    },
    response: {
      200: VoteResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema
    }
  })

  // ==========================================
  // POST /api/vote/:resourceId/downvote - Toggle downvote
  // ==========================================
  .post('/:resourceId/downvote', downvote, {
    params: t.Object({
      resourceId: t.String({ minLength: 1 })
    }),
    auth: true,
    detail: {
      tags: ['Votes'],
      summary: 'Toggle downvote',
      description:
        'Toggle downvote for a resource. If already downvoted, removes it. If upvoted, switches to downvote.'
    },
    response: {
      200: VoteResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema
    }
  })

  // ==========================================
  // GET /api/vote/stream/:resourceId - SSE stream
  // ==========================================
  .get(
    '/stream/:resourceId',
    async ({ params, set }) => {
      const { resourceId } = params

      // Validate resourceId format
      if (!resourceId || !UUID_REGEX.test(resourceId)) {
        set.status = 400
        return errorResponse('VALIDATION_ERROR', 'Invalid resource ID format')
      }

      // Check if resource exists
      const exists = await checkResourceExists(resourceId)
      if (!exists) {
        set.status = 404
        return errorResponse('NOT_FOUND', 'Resource not found')
      }

      // Set SSE headers
      set.headers['Content-Type'] = 'text/event-stream'
      set.headers['Cache-Control'] = 'no-cache'
      set.headers['Connection'] = 'keep-alive'

      // Create subscriber connection
      const subscriber = new Redis({
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        password: env.REDIS_PASSWORD || undefined
      })

      // Cleanup function to avoid connection leaks
      const cleanup = () => {
        try {
          subscriber.unsubscribe()
          subscriber.quit()
        } catch {
          // Ignore cleanup errors
        }
      }

      try {
        // Get initial counts first (before subscribing)
        const initialCounts = await getVoteCounts(resourceId)

        // Create readable stream
        const stream = new ReadableStream({
          async start(controller) {
            // Attach message handler BEFORE subscribing
            subscriber.on('message', (channel, message) => {
              try {
                const data = JSON.parse(message)
                if (data.resourceId === resourceId) {
                  controller.enqueue(`data: ${JSON.stringify({ type: 'update', ...data })}\n\n`)
                }
              } catch {
                // Ignore parse errors
              }
            })

            // Handle Redis connection errors
            subscriber.on('error', (err) => {
              console.error('Redis subscriber error:', err)
              controller.error(err)
              cleanup()
            })

            // Subscribe after attaching handlers - wrap in try-catch to ensure cleanup
            try {
              await subscriber.subscribe(REDIS_KEY.VOTE_CHANNEL)

              // Send initial counts only after successful subscribe
              controller.enqueue(
                `data: ${JSON.stringify({ type: 'init', resourceId, ...initialCounts })}\n\n`
              )
            } catch (subscribeError) {
              console.error('Redis subscribe error:', subscribeError)
              cleanup()
              controller.error(subscribeError)
            }
          },
          cancel() {
            cleanup()
          }
        })

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive'
          }
        })
      } catch (error) {
        // Cleanup on any error during setup
        cleanup()
        throw error
      }
    },
    {
      params: t.Object({
        resourceId: t.String({ minLength: 1 })
      }),
      detail: {
        tags: ['Votes'],
        summary: 'SSE stream for vote updates',
        description: 'Server-Sent Events stream for real-time vote count updates.'
      }
    }
  )
