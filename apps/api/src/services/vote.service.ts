import { redis } from '@/lib/redis'
import { db } from '@/db'
import { userVote, resource } from '@/db/schema'
import { eq, and, count } from 'drizzle-orm'
import { REDIS_KEY } from '@/constants'
import { upvoteQueue } from '@/lib/queue'
import { logger } from '@/lib/logger'

const voteLogger = logger.child({ service: 'vote' })

export type VoteType = 'upvote' | 'downvote'
export type VoteState = VoteType | null

// ==========================================
// Get Vote Counts (from Redis, fallback to DB)
// ==========================================
export async function getVoteCounts(
  resourceId: string
): Promise<{ upvotes: number; downvotes: number }> {
  // Try Redis first
  const [upvotes, downvotes] = await Promise.all([
    redis.get(REDIS_KEY.UPVOTE_COUNT(resourceId)),
    redis.get(REDIS_KEY.DOWNVOTE_COUNT(resourceId))
  ])

  if (upvotes !== null && downvotes !== null) {
    return {
      upvotes: parseInt(upvotes),
      downvotes: parseInt(downvotes)
    }
  }

  // Fallback to DB
  const result = await db
    .select({
      upvoteCount: resource.upvoteCount,
      downvoteCount: resource.downvoteCount
    })
    .from(resource)
    .where(eq(resource.id, resourceId))
    .limit(1)

  const counts = result[0] ?? { upvoteCount: 0, downvoteCount: 0 }

  // Cache in Redis
  await Promise.all([
    redis.set(REDIS_KEY.UPVOTE_COUNT(resourceId), counts.upvoteCount.toString()),
    redis.set(REDIS_KEY.DOWNVOTE_COUNT(resourceId), counts.downvoteCount.toString())
  ])

  return { upvotes: counts.upvoteCount, downvotes: counts.downvoteCount }
}

// ==========================================
// Get User's Current Vote
// ==========================================
export async function getUserVote(resourceId: string, userId: string): Promise<VoteState> {
  // Try Redis first
  const [hasUpvote, hasDownvote] = await Promise.all([
    redis.sismember(REDIS_KEY.VOTE_UPVOTES(resourceId), userId),
    redis.sismember(REDIS_KEY.VOTE_DOWNVOTES(resourceId), userId)
  ])

  if (hasUpvote === 1) return 'upvote'
  if (hasDownvote === 1) return 'downvote'

  // Fallback to DB if Redis cache is cold
  const dbVote = await db
    .select({ type: userVote.type })
    .from(userVote)
    .where(and(eq(userVote.resourceId, resourceId), eq(userVote.userId, userId)))
    .limit(1)

  if (dbVote.length > 0 && dbVote[0]) {
    const voteType = dbVote[0].type as VoteType
    // Warm the cache
    if (voteType === 'upvote') {
      await redis.sadd(REDIS_KEY.VOTE_UPVOTES(resourceId), userId)
    } else {
      await redis.sadd(REDIS_KEY.VOTE_DOWNVOTES(resourceId), userId)
    }
    return voteType
  }

  return null
}

// ==========================================
// Redis Lua Script for Atomic Vote Toggle
// ==========================================
// KEYS: [1] upvotesKey, [2] downvotesKey, [3] upCountKey, [4] downCountKey
// ARGV: [1] userId, [2] voteType ('upvote' or 'downvote')
// Returns: [action, newVote, fromType, upvotes, downvotes]
const VOTE_TOGGLE_SCRIPT = `
local upvotesKey = KEYS[1]
local downvotesKey = KEYS[2]
local upCountKey = KEYS[3]
local downCountKey = KEYS[4]
local userId = ARGV[1]
local voteType = ARGV[2]

-- Check current vote state
local hasUpvote = redis.call('SISMEMBER', upvotesKey, userId)
local hasDownvote = redis.call('SISMEMBER', downvotesKey, userId)

local action = ''
local newVote = ''
local fromType = ''

if voteType == 'upvote' then
    if hasUpvote == 1 then
        -- Already upvoted -> remove upvote
        redis.call('SREM', upvotesKey, userId)
        redis.call('DECR', upCountKey)
        action = 'remove'
        newVote = 'null'
    elseif hasDownvote == 1 then
        -- Was downvoted -> switch to upvote
        redis.call('SREM', downvotesKey, userId)
        redis.call('DECR', downCountKey)
        redis.call('SADD', upvotesKey, userId)
        redis.call('INCR', upCountKey)
        action = 'switch'
        newVote = 'upvote'
        fromType = 'downvote'
    else
        -- No vote -> add upvote
        redis.call('SADD', upvotesKey, userId)
        redis.call('INCR', upCountKey)
        action = 'add'
        newVote = 'upvote'
    end
else
    -- downvote
    if hasDownvote == 1 then
        -- Already downvoted -> remove downvote
        redis.call('SREM', downvotesKey, userId)
        redis.call('DECR', downCountKey)
        action = 'remove'
        newVote = 'null'
    elseif hasUpvote == 1 then
        -- Was upvoted -> switch to downvote
        redis.call('SREM', upvotesKey, userId)
        redis.call('DECR', upCountKey)
        redis.call('SADD', downvotesKey, userId)
        redis.call('INCR', downCountKey)
        action = 'switch'
        newVote = 'downvote'
        fromType = 'upvote'
    else
        -- No vote -> add downvote
        redis.call('SADD', downvotesKey, userId)
        redis.call('INCR', downCountKey)
        action = 'add'
        newVote = 'downvote'
    end
end

-- Get updated counts
local upvotes = redis.call('GET', upCountKey) or '0'
local downvotes = redis.call('GET', downCountKey) or '0'

return {action, newVote, fromType, upvotes, downvotes}
`

// Toggle Vote (atomic Lua script)
// ==========================================
export async function toggleVote(
  resourceId: string,
  userId: string,
  type: VoteType
): Promise<{ userVote: VoteState; upvotes: number; downvotes: number }> {
  const upvotesKey = REDIS_KEY.VOTE_UPVOTES(resourceId)
  const downvotesKey = REDIS_KEY.VOTE_DOWNVOTES(resourceId)
  const upCountKey = REDIS_KEY.UPVOTE_COUNT(resourceId)
  const downCountKey = REDIS_KEY.DOWNVOTE_COUNT(resourceId)

  // Warm cache to ensure upCountKey and downCountKey exist before running Lua script
  // This prevents the script from operating on nil counts on cold cache
  await getVoteCounts(resourceId)

  // Execute atomic Lua script
  const result = (await redis.eval(
    VOTE_TOGGLE_SCRIPT,
    4, // number of keys
    upvotesKey,
    downvotesKey,
    upCountKey,
    downCountKey,
    userId,
    type
  )) as [string, string, string, string, string]

  const [actionStr, newVoteStr, fromTypeStr, upvotesStr, downvotesStr] = result

  // Map Lua results to TypeScript types
  const action = actionStr as 'add' | 'remove' | 'switch'
  const newVote: VoteState = newVoteStr === 'null' ? null : (newVoteStr as VoteType)
  const fromType: VoteType | null = fromTypeStr === '' ? null : (fromTypeStr as VoteType)

  const counts = {
    upvotes: parseInt(upvotesStr || '0'),
    downvotes: parseInt(downvotesStr || '0')
  }

  // Queue DB sync
  await upvoteQueue.add('vote-sync', {
    resourceId,
    userId,
    type,
    action,
    fromType
  })

  // Publish event for SSE
  await redis.publish(
    REDIS_KEY.VOTE_CHANNEL,
    JSON.stringify({
      resourceId,
      upvotes: counts.upvotes,
      downvotes: counts.downvotes,
      action,
      type
    })
  )

  voteLogger.info({ resourceId, userId, type, action, newVote }, 'Vote toggled')

  return { userVote: newVote, ...counts }
}

// ==========================================
// Get Multiple Vote Counts (batch)
// ==========================================
export async function getVoteCountsBatch(
  resourceIds: string[]
): Promise<Map<string, { upvotes: number; downvotes: number }>> {
  const result = new Map<string, { upvotes: number; downvotes: number }>()
  if (resourceIds.length === 0) return result

  // Try Redis first
  const pipeline = redis.pipeline()
  for (const id of resourceIds) {
    pipeline.get(REDIS_KEY.UPVOTE_COUNT(id))
    pipeline.get(REDIS_KEY.DOWNVOTE_COUNT(id))
  }

  const results = await pipeline.exec()
  const missingIds: string[] = []

  for (let i = 0; i < resourceIds.length; i++) {
    const upvotes = results?.[i * 2]?.[1] as string | null
    const downvotes = results?.[i * 2 + 1]?.[1] as string | null

    if (upvotes !== null && downvotes !== null) {
      result.set(resourceIds[i]!, {
        upvotes: parseInt(upvotes),
        downvotes: parseInt(downvotes)
      })
    } else {
      // Cache miss - need to check DB
      missingIds.push(resourceIds[i]!)
    }
  }

  // Fallback to DB for missing counts (cold cache)
  if (missingIds.length > 0) {
    const { inArray } = await import('drizzle-orm')
    const dbCounts = await db
      .select({
        id: resource.id,
        upvoteCount: resource.upvoteCount,
        downvoteCount: resource.downvoteCount
      })
      .from(resource)
      .where(inArray(resource.id, missingIds))

    // Warm the cache and update results
    const warmCachePipeline = redis.pipeline()
    for (const row of dbCounts) {
      result.set(row.id, {
        upvotes: row.upvoteCount,
        downvotes: row.downvoteCount
      })
      warmCachePipeline.set(REDIS_KEY.UPVOTE_COUNT(row.id), row.upvoteCount.toString())
      warmCachePipeline.set(REDIS_KEY.DOWNVOTE_COUNT(row.id), row.downvoteCount.toString())
    }
    if (dbCounts.length > 0) {
      await warmCachePipeline.exec()
    }

    // Set 0 for IDs not found in DB (resource doesn't exist)
    for (const id of missingIds) {
      if (!result.has(id)) {
        result.set(id, { upvotes: 0, downvotes: 0 })
      }
    }
  }

  return result
}

// ==========================================
// Get User Votes for Multiple Resources
// ==========================================
export async function getUserVotesBatch(
  resourceIds: string[],
  userId: string
): Promise<Map<string, VoteState>> {
  const result = new Map<string, VoteState>()
  if (resourceIds.length === 0 || !userId) return result

  // Try Redis first
  const pipeline = redis.pipeline()
  for (const id of resourceIds) {
    pipeline.sismember(REDIS_KEY.VOTE_UPVOTES(id), userId)
    pipeline.sismember(REDIS_KEY.VOTE_DOWNVOTES(id), userId)
  }

  const results = await pipeline.exec()
  const missingIds: string[] = []

  for (let i = 0; i < resourceIds.length; i++) {
    const hasUpvote = results?.[i * 2]?.[1] === 1
    const hasDownvote = results?.[i * 2 + 1]?.[1] === 1

    if (hasUpvote) {
      result.set(resourceIds[i]!, 'upvote')
    } else if (hasDownvote) {
      result.set(resourceIds[i]!, 'downvote')
    } else {
      // Not found in Redis, need to check DB
      missingIds.push(resourceIds[i]!)
      result.set(resourceIds[i]!, null)
    }
  }

  // Fallback to DB for missing votes (cold cache)
  if (missingIds.length > 0) {
    const { inArray } = await import('drizzle-orm')
    const dbVotes = await db
      .select({ resourceId: userVote.resourceId, type: userVote.type })
      .from(userVote)
      .where(and(eq(userVote.userId, userId), inArray(userVote.resourceId, missingIds)))

    // Warm the cache and update results
    const warmCachePipeline = redis.pipeline()
    for (const vote of dbVotes) {
      const voteType = vote.type as VoteType
      result.set(vote.resourceId, voteType)
      if (voteType === 'upvote') {
        warmCachePipeline.sadd(REDIS_KEY.VOTE_UPVOTES(vote.resourceId), userId)
      } else {
        warmCachePipeline.sadd(REDIS_KEY.VOTE_DOWNVOTES(vote.resourceId), userId)
      }
    }
    if (dbVotes.length > 0) {
      await warmCachePipeline.exec()
    }
  }

  return result
}
