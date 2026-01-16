import { Elysia } from 'elysia'
import { authMiddleware } from '@/middleware/auth.middleware'
import * as scrapeHandler from '@/controllers/scrape.controller'
import { scrapeUrlSchema } from './scrape.schema'
import { redis } from '@/lib/redis'

// Rate limiting configuration
const RATE_LIMIT_MAX = 10 // 10 requests per minute
const RATE_LIMIT_WINDOW = 60 // 1 minute in seconds
const RATE_LIMIT_PREFIX = 'rate-limit:scrape:'

/**
 * Custom rate limiting middleware for scrape endpoint
 * Keys by user.id (from auth) or IP address as fallback
 * Runs after auth middleware so user.id is available
 */
const scrapeRateLimit = new Elysia({ name: 'scrape-rate-limit' }).onBeforeHandle(
  async ({ request, server, ...context }) => {
    // Get client identifier: prefer user.id from auth (added by authMiddleware macro), fallback to IP
    const user = (context as { user?: { id: string } }).user
    const clientId =
      user?.id ||
      server?.requestIP(request)?.address ||
      request.headers.get('x-forwarded-for') ||
      'unknown'
    const rateLimitKey = `${RATE_LIMIT_PREFIX}${clientId}`

    // Check current count
    const currentCount = await redis.get(rateLimitKey)
    const count = currentCount ? parseInt(currentCount, 10) : 0

    if (count >= RATE_LIMIT_MAX) {
      // Get TTL to provide retry-after information
      const ttl = await redis.ttl(rateLimitKey)
      throw new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please wait a moment and try again.'
          }
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': ttl > 0 ? ttl.toString() : RATE_LIMIT_WINDOW.toString()
          }
        }
      )
    }

    // Increment counter
    if (count === 0) {
      // First request in window, set with expiration
      await redis.set(rateLimitKey, '1', 'EX', RATE_LIMIT_WINDOW)
    } else {
      // Increment existing counter (TTL is preserved)
      await redis.incr(rateLimitKey)
    }
  }
)

export const scrapeRoutes = new Elysia({ prefix: '/api/scrape' })
  .use(authMiddleware)
  .use(scrapeRateLimit)

  // POST /api/scrape - Scrape URL for metadata (authenticated)
  .post('/', scrapeHandler.scrape, {
    ...scrapeUrlSchema,
    auth: true
  })
