import { Elysia } from 'elysia'
import { rateLimit } from 'elysia-rate-limit'
import { cors } from '@elysiajs/cors'
import { logger } from 'elysia-logger'
import { env } from '@/config/env'

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

export type App = typeof app
