import { toggleVote, getVoteCounts, type VoteType } from '@/services/vote.service'
import { HttpStatusEnum } from 'elysia-http-status-code/status'
import type { Context } from 'elysia'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/utils/errors'

const controllerLogger = logger.child({ controller: 'vote' })

// User type from auth middleware
interface UserAuth {
  id: string
  email: string
  name: string
}

// ==========================================
// Toggle Upvote
// ==========================================
export const upvote = async ({
  params,
  user,
  set
}: {
  params: { resourceId: string }
  user: UserAuth
  set: Context['set']
}) => {
  try {
    const result = await toggleVote(params.resourceId, user.id, 'upvote')
    return {
      status: HttpStatusEnum.HTTP_200_OK,
      userVote: result.userVote,
      upvotes: result.upvotes,
      downvotes: result.downvotes
    }
  } catch (error) {
    controllerLogger.error({ error, resourceId: params.resourceId }, 'Upvote failed')
    set.status = HttpStatusEnum.HTTP_500_INTERNAL_SERVER_ERROR
    return errorResponse('INTERNAL_ERROR', 'Failed to toggle upvote')
  }
}

// ==========================================
// Toggle Downvote
// ==========================================
export const downvote = async ({
  params,
  user,
  set
}: {
  params: { resourceId: string }
  user: UserAuth
  set: Context['set']
}) => {
  try {
    const result = await toggleVote(params.resourceId, user.id, 'downvote')
    return {
      status: HttpStatusEnum.HTTP_200_OK,
      userVote: result.userVote,
      upvotes: result.upvotes,
      downvotes: result.downvotes
    }
  } catch (error) {
    controllerLogger.error({ error, resourceId: params.resourceId }, 'Downvote failed')
    set.status = HttpStatusEnum.HTTP_500_INTERNAL_SERVER_ERROR
    return errorResponse('INTERNAL_ERROR', 'Failed to toggle downvote')
  }
}

// ==========================================
// Get Vote Counts
// ==========================================
export const getCounts = async ({
  params,
  set
}: {
  params: { resourceId: string }
  set: Context['set']
}) => {
  try {
    const counts = await getVoteCounts(params.resourceId)
    return {
      status: HttpStatusEnum.HTTP_200_OK,
      ...counts
    }
  } catch (error) {
    controllerLogger.error({ error, resourceId: params.resourceId }, 'Get counts failed')
    set.status = HttpStatusEnum.HTTP_500_INTERNAL_SERVER_ERROR
    return errorResponse('INTERNAL_ERROR', 'Failed to get vote counts')
  }
}
