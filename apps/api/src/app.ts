import { Elysia } from 'elysia'
import { rateLimit } from 'elysia-rate-limit'
import { cors } from '@elysiajs/cors'
import { logger } from 'elysia-logger'
import { env } from '@/config/env'
import { AuthOpenAPI } from './lib/auth-open-api'
import openapi from '@elysiajs/openapi'
import type { OpenAPIV3 } from 'openapi-types'
import { scrapeRoutes } from './routes/scrape'
import { resourcesRoutes } from './routes/resources'
import { uploadRoutes } from './routes/upload'

export const app = new Elysia()

  .onRequest(() => {
    // console.log('!!! INCOMING REQUEST:', request.method, request.url);
  })
  .use(
    logger({
      level: env.LOG_LEVEL
    })
  )
  .use(
    rateLimit({
      max: 60,
      duration: 60000,
      generator: (req, server) =>
        req.headers.get('x-api-key') || server?.requestIP(req)?.address || '',
      errorResponse: new Response(
        JSON.stringify({
          status: 429,
          message: 'Too many requests - try again later'
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
  .onError(({ code, error }) => {
    if (error instanceof Response) {
      return error
    }
    return {
      status: 'error',
      code,
      message: error.toString()
    }
  })
  .get('/', () => {
    return {
      status: 'Ok',
      message: 'Server is running'
    }
  })
  .get('/health', () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString()
    }
  })
  .use(resourcesRoutes)
  .use(scrapeRoutes)
  .use(uploadRoutes)

export type App = typeof app
