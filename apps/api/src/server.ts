import { app } from '@/app'
import { env } from '@/config/env'
import { connectRedis } from '@/lib/redis'
import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import '@/workers/vote.worker'

await connectRedis()

app.mount(auth.handler).listen(env.PORT, () => {
  logger.info(
    {
      port: app.server?.port,
      hostname: app.server?.hostname,
      env: env.NODE_ENV
    },
    'Server started'
  )

  logger.info(
    { url: `http://${app.server?.hostname}:${app.server?.port}/docs` },
    'OpenAPI docs available'
  )
})
