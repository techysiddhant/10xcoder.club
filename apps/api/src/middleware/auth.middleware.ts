import { Elysia } from 'elysia'
import { auth } from '@/lib/auth'
import { HttpStatusEnum } from 'elysia-http-status-code/status'
import { logger } from '@/lib/logger'
import { RoleSchema } from '@workspace/schemas'

async function getSessionOrThrow(headers: Headers) {
  const session = await auth.api.getSession({
    headers
  })

  if (!session) {
    logger.warn('Authentication failed: No valid session')
    throw Response.json(
      {
        success: false,
        message: 'Unauthorized'
      },
      { status: HttpStatusEnum.HTTP_401_UNAUTHORIZED }
    )
  }

  return session
}

export const authMiddleware = new Elysia({ name: 'auth-middleware' })
  .macro({
    // Regular authentication
    auth: {
      async resolve({ request: { headers } }) {
        const session = await getSessionOrThrow(headers)

        logger.debug({ userId: session.user.id }, 'User authenticated')
        return {
          user: session.user,
          session: session.session
        }
      }
    },
    // Admin-only authentication
    adminAuth: {
      async resolve({ request: { headers } }) {
        const session = await getSessionOrThrow(headers)

        const role = session.user.role ?? ''
        if (role !== RoleSchema.enum.ADMIN) {
          logger.warn({ userId: session.user.id, role: session.user.role }, 'Admin access denied')
          throw Response.json(
            {
              success: false,
              message: 'Forbidden: Admin access required'
            },
            { status: HttpStatusEnum.HTTP_403_FORBIDDEN }
          )
        }

        logger.debug({ userId: session.user.id }, 'Admin authenticated')
        return {
          user: session.user,
          session: session.session
        }
      }
    }
  })
  .as('global')
