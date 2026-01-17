import { Elysia, t } from 'elysia'
import { authMiddleware } from '@/middleware/auth.middleware'
import { getPresignedUploadUrl } from '@/services/upload.service'
import { HttpStatusEnum } from 'elysia-http-status-code/status'
import { ErrorResponseSchema, errorResponse } from '@/utils/errors'

export const uploadRoutes = new Elysia({ prefix: '/api/upload' })
  .use(authMiddleware)

  // ==========================================
  // POST /api/upload/presigned - Get presigned URL for direct S3 upload
  // ==========================================
  .post(
    '/presigned',
    async ({ body, user, set }) => {
      // console.log('!!! INCOMING REQUEST:', body, user)
      const result = await getPresignedUploadUrl(
        {
          fileName: body.fileName,
          fileType: body.fileType,
          fileSize: body.fileSize,
          folder: body.folder
        },
        user.id
      )

      if (!result.success) {
        if (result.errorType === 'INTERNAL_ERROR') {
          set.status = HttpStatusEnum.HTTP_500_INTERNAL_SERVER_ERROR
          return errorResponse('INTERNAL_ERROR', result.error)
        }
        set.status = HttpStatusEnum.HTTP_400_BAD_REQUEST
        return errorResponse('VALIDATION_ERROR', result.error)
      }

      // Return uploadUrl and key for client
      // Client uploads directly to uploadUrl, then passes key to another API
      return {
        status: HttpStatusEnum.HTTP_200_OK,
        uploadUrl: result.data.uploadUrl,
        key: result.data.key,
        expiresIn: result.data.expiresIn
      }
    },
    {
      body: t.Object({
        fileName: t.String({ minLength: 1, maxLength: 255 }),
        fileType: t.Union([
          t.Literal('image/jpeg'),
          t.Literal('image/jpg'),
          t.Literal('image/png'),
          t.Literal('image/webp')
        ]),
        fileSize: t.Number({ minimum: 1, maximum: 2 * 1024 * 1024 }), // Max 2MB
        folder: t.Union([t.Literal('resources'), t.Literal('profiles')]) // Only allowed folders
      }),
      auth: true,
      detail: {
        tags: ['Upload'],
        summary: 'Get presigned URL for direct S3 upload',
        description:
          'Returns a presigned S3 URL and key for direct file upload from client. Folder must be "resources" or "profiles". Max: 2MB. Types: JPEG, PNG, JPG, WebP.'
      },
      response: {
        200: t.Object({
          status: t.Number({ example: 200 }),
          uploadUrl: t.String(),
          key: t.String(),
          expiresIn: t.Number()
        }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  )
