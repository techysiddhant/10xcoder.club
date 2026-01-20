import { Elysia, t } from 'elysia'
import { authMiddleware } from '@/middleware/auth.middleware'
import { upvote, downvote } from '@/controllers/vote.controller'
import { ErrorResponseSchema, errorResponse } from '@/utils/errors'
import { addVoteClient, removeVoteClient, isVoteSubscriberReady } from '@/lib/vote-subscriber'

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
  // GET /api/vote/stream - SSE stream for all vote updates (public, rate-limited)
  // ==========================================
  .get(
    '/stream',
    async ({ set }) => {
      // Check if subscriber is ready before accepting clients
      if (!isVoteSubscriberReady()) {
        set.status = 503
        return errorResponse('INTERNAL_ERROR', 'Vote stream service unavailable', 503)
      }

      // Generate unique client ID
      const clientId = crypto.randomUUID()

      // Set SSE headers
      set.headers['Content-Type'] = 'text/event-stream'
      set.headers['Cache-Control'] = 'no-cache'
      set.headers['Connection'] = 'keep-alive'

      // Create readable stream
      const stream = new ReadableStream<string>({
        start(controller) {
          // Register this client with the shared subscriber
          const added = addVoteClient(clientId, controller)

          if (!added) {
            // Subscriber became unavailable - close the stream
            controller.close()
            return
          }

          // Send connection confirmation
          controller.enqueue(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`)
        },
        cancel() {
          // Client disconnected - clean up
          removeVoteClient(clientId)
        }
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive'
        }
      })
    },
    {
      detail: {
        tags: ['Votes'],
        summary: 'SSE stream for vote updates',
        description:
          'Server-Sent Events stream for real-time vote count updates. Public endpoint with global rate limiting. Clients should filter updates by resourceId as needed.'
      },
      response: {
        503: ErrorResponseSchema
      }
    }
  )
