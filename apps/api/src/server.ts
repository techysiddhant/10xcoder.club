// Sentry must be imported first for proper instrumentation
import '@/lib/sentry'

import { app } from '@/app'
import { env } from '@/config/env'
import { connectRedis } from '@/lib/redis'
import { auth } from '@/lib/auth'

await connectRedis()

app.mount(auth.handler).listen(env.PORT, () => {
  console.log(`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`)
  console.log(`📚 OpenAPI documentation at http://${app.server?.hostname}:${app.server?.port}/docs`)
})
