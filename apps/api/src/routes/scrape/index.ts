import { Elysia } from 'elysia'
import { authMiddleware } from '@/middleware/auth.middleware'
import * as scrapeHandler from '@/controllers/scrape.controller'
import { scrapeUrlSchema } from './scrape.schema'
import { redis } from '@/lib/redis'

// Rate limiting configuration
const RATE_LIMIT_MAX = 10 // 10 requests per minute
const RATE_LIMIT_WINDOW = 60 // 1 minute in seconds
const RATE_LIMIT_PREFIX = 'rate-limit:scrape:'

// Lua script for atomic rate limiting
const RATE_LIMIT_SCRIPT = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local current = tonumber(redis.call('GET', key) or '0')
if current >= limit then
  local ttl = redis.call('TTL', key)
  return {0, ttl}
end
if current == 0 then
  redis.call('SET', key, 1, 'EX', window)
else
  redis.call('INCR', key)
end
return {1, -1}
`

/**
 * Custom rate limiting middleware for scrape endpoint
 * Keys by user.id (from auth) or IP address as fallback
 * Runs after auth middleware so user.id is available
 */
const scrapeRateLimit = new Elysia({ name: 'scrape-rate-limit' }).onBeforeHandle(
  async ({ request, server, ...context }) => {
    const user = (context as { user?: { id: string } }).user
    const clientId =
      user?.id ||
      server?.requestIP(request)?.address ||
      request.headers.get('x-forwarded-for') ||
      'unknown'
    const rateLimitKey = `${RATE_LIMIT_PREFIX}${clientId}`

    try {
      const [allowed, ttl] = (await redis.eval(
        RATE_LIMIT_SCRIPT,
        1,
        rateLimitKey,
        RATE_LIMIT_MAX,
        RATE_LIMIT_WINDOW
      )) as [number, number]

      if (!allowed) {
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
    } catch (error) {
      if (error instanceof Response) throw error
      // Log Redis error but allow request to proceed (fail-open)
      console.error('Rate limit Redis error:', error)
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
