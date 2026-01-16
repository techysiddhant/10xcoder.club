import { Elysia, t } from 'elysia'
import { authMiddleware } from '@/middleware/auth.middleware'
import { listResources, updateStatus, deleteResource } from '@/controllers/admin.controller'
import { ErrorResponseSchema } from '@/utils/errors'
import {
  getAllResourceTypes,
  createResourceType,
  updateResourceType,
  deleteResourceType
} from '@/services/resource-type.service'

export const adminRoutes = new Elysia({ prefix: '/api/admin' })
  .use(authMiddleware)

  // ==========================================
  // GET /api/admin/resources - List all resources (admin only)
  // ==========================================
  .get('/resources', listResources, {
    query: t.Object({
      page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
      limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
      status: t.Optional(
        t.Union([t.Literal('approved'), t.Literal('rejected'), t.Literal('pending')])
      ),
      search: t.Optional(t.String())
    }),
    adminAuth: true,
    detail: {
      tags: ['Admin'],
      summary: 'List all resources (Admin)',
      description: 'Returns all resources including pending and rejected. Admin only.'
    },
    response: {
      200: t.Object({
        status: t.Number({ example: 200 }),
        data: t.Array(t.Any()),
        meta: t.Object({
          total: t.Number(),
          page: t.Number(),
          limit: t.Number(),
          totalPages: t.Number()
        })
      }),
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      500: ErrorResponseSchema
    }
  })

  // ==========================================
  // PATCH /api/admin/resources/:id/status - Update resource status
  // ==========================================
  .patch('/resources/:id/status', updateStatus, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      status: t.Union([t.Literal('approved'), t.Literal('rejected')]),
      reason: t.Optional(t.String({ maxLength: 500 }))
    }),
    adminAuth: true,
    detail: {
      tags: ['Admin'],
      summary: 'Update resource status (Admin)',
      description: 'Approve or reject a resource. Admin only.'
    },
    response: {
      200: t.Object({
        status: t.Number({ example: 200 }),
        data: t.Any()
      }),
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema
    }
  })

  // ==========================================
  // DELETE /api/admin/resources/:id - Delete any resource
  // ==========================================
  .delete('/resources/:id', deleteResource, {
    params: t.Object({
      id: t.String()
    }),
    adminAuth: true,
    detail: {
      tags: ['Admin'],
      summary: 'Delete resource (Admin)',
      description: 'Soft delete any resource. Admin only.'
    },
    response: {
      200: t.Object({
        status: t.Number({ example: 200 }),
        success: t.Boolean(),
        message: t.String()
      }),
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema
    }
  })

  // ==========================================
  // Resource Types CRUD
  // ==========================================

  // GET /api/admin/resource-types - List all resource types
  .get(
    '/resource-types',
    async () => {
      const types = await getAllResourceTypes()
      return { status: 200, data: types }
    },
    {
      adminAuth: true,
      detail: {
        tags: ['Admin'],
        summary: 'List resource types (Admin)',
        description: 'Returns all resource types.'
      }
    }
  )

  // POST /api/admin/resource-types - Create resource type
  .post(
    '/resource-types',
    async ({ body, set }) => {
      try {
        const result = await createResourceType(body)
        set.status = 201
        return { success: true, data: result }
      } catch (error) {
        set.status = 400
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to create resource type'
        }
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        label: t.String({ minLength: 1 }),
        icon: t.Optional(t.String())
      }),
      adminAuth: true,
      detail: {
        tags: ['Admin'],
        summary: 'Create resource type (Admin)',
        description: 'Creates a new resource type.'
      }
    }
  )

  // PUT /api/admin/resource-types/:id - Update resource type
  .put(
    '/resource-types/:id',
    async ({ params, body, set }) => {
      const result = await updateResourceType(params.id, body)
      if (!result) {
        set.status = 404
        return { success: false, message: 'Resource type not found' }
      }
      return { status: 200, data: result }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1 })),
        label: t.Optional(t.String({ minLength: 1 })),
        icon: t.Optional(t.String())
      }),
      adminAuth: true,
      detail: {
        tags: ['Admin'],
        summary: 'Update resource type (Admin)',
        description: 'Updates an existing resource type.'
      }
    }
  )

  // DELETE /api/admin/resource-types/:id - Delete resource type
  .delete(
    '/resource-types/:id',
    async ({ params, set }) => {
      const result = await deleteResourceType(params.id)
      if (!result) {
        set.status = 404
        return { success: false, message: 'Resource type not found' }
      }
      return { status: 200, data: result }
    },
    {
      params: t.Object({ id: t.String() }),
      adminAuth: true,
      detail: {
        tags: ['Admin'],
        summary: 'Delete resource type (Admin)',
        description: 'Deletes a resource type. Will fail if resources exist with this type.'
      }
    }
  )
