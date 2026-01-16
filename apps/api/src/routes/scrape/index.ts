import { Elysia } from 'elysia'
import { authMiddleware } from '@/middleware/auth.middleware'
import * as scrapeHandler from '@/controllers/scrape.controller'
import { scrapeUrlSchema } from './scrape.schema'

export const scrapeRoutes = new Elysia({ prefix: '/api/scrape' })
  .use(authMiddleware)

  // POST /api/scrape - Scrape URL for metadata (authenticated)
  .post('/', scrapeHandler.scrape, {
    ...scrapeUrlSchema,
    auth: true
  })
