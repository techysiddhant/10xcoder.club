import {
  createResource,
  getPublicResourceById,
  getAllResources,
  updateResource,
  deleteResource,
  restoreResource,
  getUserResources,
  getUserResourceById
} from '@/services/resources.service'
import { HttpStatusEnum } from 'elysia-http-status-code/status'
import type { Context } from 'elysia'
import { errorResponse } from '@/utils/errors'

// Type for authenticated user from middleware
type UserAuth = {
  id: string
  name?: string | null
  email: string
  image?: string | null
  emailVerified: boolean
}

// ==========================================
// Constants
// ==========================================
const DEFAULT_LIMIT = 20
const MAX_USER_RESOURCES_LIMIT = 100
const MAX_PUBLIC_LIMIT = 50

// ==========================================
// Get User's Own Resource by ID (any status)
// ==========================================

export const getMyResourceById = async ({
  params,
  user,
  set
}: {
  params: { id: string }
  user: UserAuth
  set: Context['set']
}) => {
  const result = await getUserResourceById(params.id, user.id)

  if (!result) {
    set.status = HttpStatusEnum.HTTP_404_NOT_FOUND
    return errorResponse('NOT_FOUND', 'Resource not found', 404)
  }

  return {
    status: HttpStatusEnum.HTTP_200_OK,
    data: result
  }
}

// ==========================================
// Get User's Own Resources (with KPIs)
// ==========================================

export const getMyResources = async ({
  query,
  user,
  set
}: {
  query: {
    page?: number
    limit?: number
    status?: 'approved' | 'rejected' | 'pending'
    resourceType?: string
    search?: string
  }
  user: UserAuth
  set: Context['set']
}) => {
  // Cap the limit to prevent performance issues
  const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_USER_RESOURCES_LIMIT)

  const result = await getUserResources(user.id, {
    page: query.page ?? 1,
    limit,
    status: query.status,
    resourceType: query.resourceType,
    search: query.search
  })

  return {
    status: HttpStatusEnum.HTTP_200_OK,
    ...result
  }
}

// ==========================================
// Get All Resources (Cursor-based Pagination)
// ==========================================

export const getResources = async ({
  query,
  userId
}: {
  query: {
    cursor?: string
    limit?: number
    resourceType?: string
    language?: 'english' | 'hindi'
    tag?: string
    techStack?: string
    search?: string
  }
  userId?: string // Optional: from logged-in user
}) => {
  // Cap the limit to prevent abuse
  const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_PUBLIC_LIMIT)

  const result = await getAllResources({
    cursor: query.cursor,
    limit,
    resourceType: query.resourceType,
    language: query.language,
    tag: query.tag,
    techStack: query.techStack,
    search: query.search,
    userId
  })

  return {
    status: HttpStatusEnum.HTTP_200_OK,
    data: result.data,
    nextCursor: result.nextCursor,
    hasMore: result.hasMore
  }
}

// ==========================================
// Get Resource By ID (Public - approved + published only)
// ==========================================

export const getResource = async ({
  params,
  set
}: {
  params: { id: string }
  set: Context['set']
}) => {
  const result = await getPublicResourceById(params.id)

  if (!result) {
    set.status = HttpStatusEnum.HTTP_404_NOT_FOUND
    return errorResponse('NOT_FOUND', 'Resource not found', 404)
  }

  return {
    status: HttpStatusEnum.HTTP_200_OK,
    data: result
  }
}

// ==========================================
// Create Resource
// ==========================================

export const create = async ({
  body,
  user,
  set
}: {
  body: {
    title: string
    description?: string
    url: string
    image?: string
    resourceType: string
    language?: 'english' | 'hindi'
    tags?: string[]
    techStack?: string[]
  }
  user: UserAuth
  set: Context['set']
}) => {
  // Check if user's email is verified
  if (!user.emailVerified) {
    set.status = HttpStatusEnum.HTTP_403_FORBIDDEN
    return errorResponse(
      'EMAIL_NOT_VERIFIED',
      'Please verify your email before submitting resources',
      403
    )
  }

  const result = await createResource(
    {
      title: body.title,
      description: body.description,
      url: body.url,
      image: body.image,
      resourceType: body.resourceType,
      language: body.language ?? 'english',
      tags: body.tags ?? [],
      techStack: body.techStack ?? []
    },
    user.id
  )

  return {
    status: HttpStatusEnum.HTTP_201_CREATED,
    data: result
  }
}

// ==========================================
// Update Resource
// ==========================================

export const update = async ({
  params,
  body,
  user,
  set
}: {
  params: { id: string }
  body: {
    title?: string
    description?: string
    url?: string
    image?: string
    resourceType?: string
    language?: 'english' | 'hindi'
    tags?: string[]
    techStack?: string[]
  }
  user: UserAuth
  set: Context['set']
}) => {
  const result = await updateResource(params.id, body, user.id)

  if ('error' in result) {
    const status = result.status ?? HttpStatusEnum.HTTP_500_INTERNAL_SERVER_ERROR
    set.status = status
    const code = status === 404 ? 'NOT_FOUND' : status === 403 ? 'FORBIDDEN' : 'INTERNAL_ERROR'
    return errorResponse(code, result.error ?? 'An error occurred', status)
  }

  if (!result.data) {
    set.status = HttpStatusEnum.HTTP_404_NOT_FOUND
    return errorResponse('NOT_FOUND', 'Resource not found', 404)
  }

  return {
    status: HttpStatusEnum.HTTP_200_OK,
    data: result.data
  }
}

// ==========================================
// Delete Resource (Soft Delete)
// ==========================================

export const remove = async ({
  params,
  user,
  set
}: {
  params: { id: string }
  user: UserAuth
  set: Context['set']
}) => {
  const result = await deleteResource(params.id, user.id)

  if ('error' in result) {
    const status = result.status ?? HttpStatusEnum.HTTP_500_INTERNAL_SERVER_ERROR
    set.status = status
    const code = status === 404 ? 'NOT_FOUND' : status === 403 ? 'FORBIDDEN' : 'INTERNAL_ERROR'
    return errorResponse(code, result.error ?? 'An error occurred', status)
  }

  return {
    status: HttpStatusEnum.HTTP_200_OK,
    success: true
  }
}

// ==========================================
// Restore Resource
// ==========================================

export const restore = async ({
  params,
  user,
  set
}: {
  params: { id: string }
  user: UserAuth
  set: Context['set']
}) => {
  const result = await restoreResource(params.id, user.id)

  if ('error' in result) {
    const status = result.status ?? HttpStatusEnum.HTTP_500_INTERNAL_SERVER_ERROR
    set.status = status
    const code = status === 404 ? 'NOT_FOUND' : status === 403 ? 'FORBIDDEN' : 'INTERNAL_ERROR'
    return errorResponse(code, result.error ?? 'An error occurred', status)
  }

  if (!result.data) {
    set.status = HttpStatusEnum.HTTP_404_NOT_FOUND
    return errorResponse('NOT_FOUND', 'Resource not found', 404)
  }

  return {
    status: HttpStatusEnum.HTTP_200_OK,
    data: result.data
  }
}
