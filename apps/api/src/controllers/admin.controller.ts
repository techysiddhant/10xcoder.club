import {
  adminGetAllResources,
  adminUpdateResourceStatus,
  adminDeleteResource
} from '@/services/admin.service'
import { HttpStatusEnum } from 'elysia-http-status-code/status'
import type { Context } from 'elysia'
import { errorResponse } from '@/utils/errors'

// ==========================================
// Helper: Handle Service Error Response
// ==========================================
type ServiceErrorResult = { success: boolean; code?: number; error?: string }

function handleServiceError(result: ServiceErrorResult, set: Context['set']) {
  if (result.code === 500) {
    set.status = HttpStatusEnum.HTTP_500_INTERNAL_SERVER_ERROR
    return errorResponse(
      'INTERNAL_ERROR',
      result.error ?? 'An internal error occurred',
      HttpStatusEnum.HTTP_500_INTERNAL_SERVER_ERROR
    )
  }

  if (result.code === 404) {
    set.status = HttpStatusEnum.HTTP_404_NOT_FOUND
    return errorResponse(
      'NOT_FOUND',
      result.error ?? 'Resource not found',
      HttpStatusEnum.HTTP_404_NOT_FOUND
    )
  }

  // Default: validation/client errors
  set.status = HttpStatusEnum.HTTP_400_BAD_REQUEST
  return errorResponse(
    'VALIDATION_ERROR',
    result.error ?? 'An error occurred',
    HttpStatusEnum.HTTP_400_BAD_REQUEST
  )
}

// ==========================================
// List All Resources (Admin)
// ==========================================

export const listResources = async ({
  query,
  set
}: {
  query: {
    page?: number
    limit?: number
    status?: 'approved' | 'rejected' | 'pending'
    search?: string
  }
  set: Context['set']
}) => {
  try {
    const result = await adminGetAllResources({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      status: query.status,
      search: query.search
    })

    if ('success' in result && result.success === false) {
      set.status = HttpStatusEnum.HTTP_500_INTERNAL_SERVER_ERROR
      return errorResponse(
        'INTERNAL_ERROR',
        (result as { error?: string }).error ?? 'Failed to fetch resources',
        HttpStatusEnum.HTTP_500_INTERNAL_SERVER_ERROR
      )
    }

    return {
      status: HttpStatusEnum.HTTP_200_OK,
      ...result
    }
  } catch (error) {
    set.status = HttpStatusEnum.HTTP_500_INTERNAL_SERVER_ERROR
    return errorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Failed to fetch resources',
      HttpStatusEnum.HTTP_500_INTERNAL_SERVER_ERROR
    )
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
  try {
    const result = await adminUpdateResourceStatus(params.id, {
      status: body.status,
      reason: body.reason
    })

    if (!result.success) {
      return handleServiceError(result, set)
    }

    return {
      status: HttpStatusEnum.HTTP_200_OK,
      data: result.data
    }
  } catch (error) {
    set.status = HttpStatusEnum.HTTP_500_INTERNAL_SERVER_ERROR
    return errorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Failed to update resource status',
      HttpStatusEnum.HTTP_500_INTERNAL_SERVER_ERROR
    )
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
    return handleServiceError(result, set)
  }

  return {
    status: HttpStatusEnum.HTTP_200_OK,
    success: true,
    message: 'Resource deleted successfully'
  }
}
