import { Elysia } from 'elysia'
import { rateLimit } from 'elysia-rate-limit'
import { cors } from '@elysiajs/cors'
import { env } from '@/config/env'
import { AuthOpenAPI } from './lib/auth-open-api'
import openapi from '@elysiajs/openapi'
import type { OpenAPIV3 } from 'openapi-types'
import { resourcesRoutes } from '@/routes/resources'
import { uploadRoutes } from '@/routes/upload'
import { adminRoutes } from '@/routes/admin'
import { voteRoutes } from '@/routes/vote'
import { scrapeRoutes } from '@/routes/scrape'
import { loggingMiddleware } from '@/middleware/logging.middleware'
import { parseError, AppError } from '@/utils/errors'

export const app = new Elysia()
  // Structured logging with request context
  .use(loggingMiddleware)
  .use(
    rateLimit({
      max: 60,
      duration: 60000,
      generator: (req, server) =>
        req.headers.get('x-api-key') || server?.requestIP(req)?.address || '',
      errorResponse: new Response(
        JSON.stringify({
          success: false,
          status: 429,
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.'
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    })
  )
  .use(
    cors({
      origin: env.CORS_ORIGIN?.split(',').map((s) => s.trim()) ?? true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization']
    })
  )
  .use(
    openapi({
      path: '/docs',
      documentation: {
        // Better Auth's generated schema is OpenAPI-like but doesn't match @elysiajs/openapi's
        // strict OpenAPI typings; cast at the integration boundary.
        components: (await AuthOpenAPI.components) as unknown as OpenAPIV3.ComponentsObject,
        paths: (await AuthOpenAPI.getPaths()) as unknown as OpenAPIV3.PathsObject<{}, {}>,
        info: {
          title: '10xcoder.club API',
          version: '1.0.0'
        }
      },
      exclude: {
        paths: ['/', '/api/health']
      },
      scalar: {
        theme: 'kepler',
        layout: 'classic',
        defaultHttpClient: {
          targetKey: 'js',
          clientKey: 'fetch'
        }
      }
    })
  )
  .onError(({ code, error, set }) => {
    // Already a Response object
    if (error instanceof Response) {
      return error
    }

    // Already an AppError
    if (error instanceof AppError) {
      set.status = error.status
      return error.toResponse()
    }

    // Parse and convert any error to AppError
    const appError = parseError(error)
    set.status = appError.status
    return appError.toResponse()
  })
  .get('/', () => {
    return {
      status: 'Ok',
      message: 'Server is running'
    }
  })
  .use(resourcesRoutes)
  .use(uploadRoutes)
  .use(adminRoutes)
  .use(voteRoutes)
  .use(scrapeRoutes)

export type App = typeof app
