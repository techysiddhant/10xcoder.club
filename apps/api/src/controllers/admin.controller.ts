import {
  adminGetAllResources,
  adminUpdateResourceStatus,
  adminDeleteResource
} from '@/services/admin.service'
import { HttpStatusEnum } from 'elysia-http-status-code/status'
import type { Context } from 'elysia'
import { errorResponse } from '@/utils/errors'

// ==========================================
// List All Resources (Admin)
// ==========================================

export const listResources = async ({
  query
}: {
  query: {
    page?: number
    limit?: number
    status?: 'approved' | 'rejected' | 'pending'
    search?: string
  }
}) => {
  const result = await adminGetAllResources({
    page: query.page ?? 1,
    limit: query.limit ?? 20,
    status: query.status,
    search: query.search
  })

  return {
    status: HttpStatusEnum.HTTP_200_OK,
    ...result
  }
}

// ==========================================
// Update Resource Status (Admin)
// ==========================================

export const updateStatus = async ({
  params,
  body,
  set
}: {
  params: { id: string }
  body: {
    status: 'approved' | 'rejected'
    reason?: string
  }
  set: Context['set']
}) => {
  const result = await adminUpdateResourceStatus(params.id, {
    status: body.status,
    reason: body.reason
  })

  if (!result.success) {
    const status =
      result.code === 404 ? HttpStatusEnum.HTTP_404_NOT_FOUND : HttpStatusEnum.HTTP_400_BAD_REQUEST
    set.status = status
    return errorResponse(
      result.code === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR',
      result.error ?? 'An error occurred',
      status
    )
  }

  return {
    status: HttpStatusEnum.HTTP_200_OK,
    data: result.data
  }
}

// ==========================================
// Delete Resource (Admin)
// ==========================================

export const deleteResource = async ({
  params,
  set
}: {
  params: { id: string }
  set: Context['set']
}) => {
  const result = await adminDeleteResource(params.id)

  if (!result.success) {
    const status =
      result.code === 404 ? HttpStatusEnum.HTTP_404_NOT_FOUND : HttpStatusEnum.HTTP_400_BAD_REQUEST
    set.status = status
    return errorResponse(
      result.code === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR',
      result.error ?? 'An error occurred',
      status
    )
  }

  return {
    status: HttpStatusEnum.HTTP_200_OK,
    success: true,
    message: 'Resource deleted successfully'
  }
}
