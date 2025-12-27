import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { ApiErrorSchema, UserCreateSchema, UserSchema } from '@workspace/schemas'
import { env } from './env'

const port = env.PORT

new Elysia()
  .use(
    cors({
      origin: env.CORS_ORIGIN?.split(',').map((s) => s.trim()) ?? true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
    })
  )
  .get('/health', () => ({ ok: true }))
  .post('/users', async ({ request, set }) => {
    const json = await request.json().catch(() => null)

    const parsed = UserCreateSchema.safeParse(json)
    if (!parsed.success) {
      set.status = 400
      return ApiErrorSchema.parse({
        message: 'Invalid request body',
        code: 'BAD_REQUEST',
        details: parsed.error.flatten()
      })
    }

    // TODO: replace with real persistence layer
    const user = UserSchema.parse({ id: crypto.randomUUID(), ...parsed.data })

    set.status = 201
    return { user }
  })
  .listen(
    {
      port
    },
    ({ hostname, port }) => {
      console.log(`API listening on http://${hostname}:${port}`)
    }
  )
