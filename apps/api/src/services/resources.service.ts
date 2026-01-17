import { db } from '@/db'
import {
  resource,
  resourceType,
  tag,
  techStack,
  resourceToTags,
  resourceToTechStack
} from '@/db/schema'
import { eq, and, isNull, or, ilike, inArray, sql, desc, lt } from 'drizzle-orm'
import { redis } from '@/lib/redis'
import { generateResourcesCacheKey, CACHE_TTL, REDIS_KEY } from '@/constant'
import { getEmbedding, isGeminiConfigured } from '@/lib/gemini'

// Type for database instance or transaction context (shared query interface)
type DbOrTransaction = Pick<typeof db, 'select' | 'insert' | 'delete' | 'update'>

// Helper to escape special characters in ILIKE patterns
// Prevents pattern injection via %, _, and backslash
function escapeILikePattern(pattern: string): string {
  return pattern
    .replace(/\\/g, '\\\\') // Escape backslashes first
    .replace(/%/g, '\\%') // Escape percent signs
    .replace(/_/g, '\\_') // Escape underscores
}

// Input types for service functions
interface CreateResourceInput {
  title: string
  url: string
  resourceType: string
  description?: string
  image?: string
  credits?: string
  language?: 'english' | 'hindi'
  tags?: string[]
  techStack?: string[]
}

interface UpdateResourceInput {
  title?: string
  url?: string
  resourceType?: string
  description?: string
  image?: string
  credits?: string
  language?: 'english' | 'hindi'
  tags?: string[]
  techStack?: string[]
}

interface ListResourcesInput {
  cursor?: string // Format: "timestamp_id" e.g. "2024-01-10T12:00:00.000Z_uuid"
  limit?: number
  resourceType?: string
  language?: 'english' | 'hindi'
  tag?: string
  techStack?: string
  search?: string
  userId?: string // Optional: to check if user has upvoted
}

interface UserResourcesInput {
  page?: number
  limit?: number
  status?: 'approved' | 'rejected' | 'pending'
  resourceType?: string
  search?: string
}

// ==========================================
// Helper: Get vote counts from Redis in batch
// ==========================================
async function getVoteCountsBatch(
  resourceIds: string[]
): Promise<Map<string, { upvotes: number; downvotes: number }>> {
  const result = new Map<string, { upvotes: number; downvotes: number }>()
  if (resourceIds.length === 0) return result

  const pipeline = redis.pipeline()
  for (const id of resourceIds) {
    pipeline.get(REDIS_KEY.UPVOTE_COUNT(id))
    pipeline.get(REDIS_KEY.DOWNVOTE_COUNT(id))
  }

  const results = await pipeline.exec()
  for (let i = 0; i < resourceIds.length; i++) {
    const upvotes = results?.[i * 2]?.[1] as string | null
    const downvotes = results?.[i * 2 + 1]?.[1] as string | null
    result.set(resourceIds[i]!, {
      upvotes: upvotes ? parseInt(upvotes) : 0,
      downvotes: downvotes ? parseInt(downvotes) : 0
    })
  }

  return result
}

// ==========================================
// Helper: Get user votes from Redis in batch
// ==========================================
type VoteState = 'upvote' | 'downvote' | null

async function getUserVotesBatch(
  resourceIds: string[],
  userId: string
): Promise<Map<string, VoteState>> {
  const result = new Map<string, VoteState>()
  if (resourceIds.length === 0 || !userId) return result

  const pipeline = redis.pipeline()
  for (const id of resourceIds) {
    pipeline.sismember(REDIS_KEY.VOTE_UPVOTES(id), userId)
    pipeline.sismember(REDIS_KEY.VOTE_DOWNVOTES(id), userId)
  }

  const results = await pipeline.exec()
  for (let i = 0; i < resourceIds.length; i++) {
    const hasUpvote = results?.[i * 2]?.[1] === 1
    const hasDownvote = results?.[i * 2 + 1]?.[1] === 1

    if (hasUpvote) {
      result.set(resourceIds[i]!, 'upvote')
    } else if (hasDownvote) {
      result.set(resourceIds[i]!, 'downvote')
    } else {
      result.set(resourceIds[i]!, null)
    }
  }

  return result
}

// ==========================================
// Helper: Get or create tags
// ==========================================
async function getOrCreateTags(tagNames: string[], tx: DbOrTransaction = db): Promise<string[]> {
  if (tagNames.length === 0) return []

  const existingTags = await tx.select().from(tag).where(inArray(tag.name, tagNames))

  const existingTagNames = new Set(existingTags.map((t) => t.name))
  const newTagNames = tagNames.filter((name) => !existingTagNames.has(name))

  if (newTagNames.length > 0) {
    await tx
      .insert(tag)
      .values(newTagNames.map((name) => ({ name })))
      .onConflictDoNothing({ target: tag.name })
  }

  const allTags = await tx.select().from(tag).where(inArray(tag.name, tagNames))

  return allTags.map((t) => t.id)
}

// ==========================================
// Helper: Get or create tech stack items
// ==========================================
async function getOrCreateTechStack(
  techNames: string[],
  tx: DbOrTransaction = db
): Promise<string[]> {
  if (techNames.length === 0) return []

  const existingTech = await tx.select().from(techStack).where(inArray(techStack.name, techNames))

  const existingTechNames = new Set(existingTech.map((t) => t.name))
  const newTechNames = techNames.filter((name) => !existingTechNames.has(name))

  if (newTechNames.length > 0) {
    await tx
      .insert(techStack)
      .values(newTechNames.map((name) => ({ name })))
      .onConflictDoNothing({ target: techStack.name })
  }

  const allTech = await tx.select().from(techStack).where(inArray(techStack.name, techNames))

  return allTech.map((t) => t.id)
}

// ==========================================
// Get Resource Type ID from Name
// ==========================================
async function getResourceTypeId(typeName: string): Promise<string | null> {
  const result = await db
    .select({ id: resourceType.id })
    .from(resourceType)
    .where(eq(resourceType.name, typeName))
    .limit(1)
  return result[0]?.id ?? null
}

// ==========================================
// Create Resource
// ==========================================
export async function createResource(data: CreateResourceInput, userId: string) {
  const {
    tags: tagNames = [],
    techStack: techStackNames = [],
    resourceType: resourceTypeName,
    ...resourceData
  } = data

  // Look up resourceTypeId from name
  const resourceTypeId = await getResourceTypeId(resourceTypeName)
  if (!resourceTypeId) {
    throw new Error(`Invalid resource type: ${resourceTypeName}`)
  }

  // Get or create tags and tech stack
  const tagIds = await getOrCreateTags(tagNames)
  const techStackIds = await getOrCreateTechStack(techStackNames)

  // Create the resource and associations in a transaction
  const newResource = await db.transaction(async (tx) => {
    // Create the resource
    const result = await tx
      .insert(resource)
      .values({
        ...resourceData,
        resourceTypeId,
        createdBy: userId
      })
      .returning()

    const createdResource = result[0]!

    // Create tag associations
    if (tagIds.length > 0) {
      await tx.insert(resourceToTags).values(
        tagIds.map((tagId) => ({
          resourceId: createdResource.id,
          tagId
        }))
      )
    }

    // Create tech stack associations
    if (techStackIds.length > 0) {
      await tx.insert(resourceToTechStack).values(
        techStackIds.map((techStackId) => ({
          resourceId: createdResource.id,
          techStackId
        }))
      )
    }

    return createdResource
  })

  return getResourceById(newResource.id)
}

// ==========================================
// Get Resource By ID
// ==========================================
export async function getResourceById(id: string) {
  const result = await db.query.resource.findFirst({
    where: and(eq(resource.id, id), isNull(resource.deletedAt)),
    with: {
      resourceType: true,
      resourceToTags: {
        with: {
          tag: true
        }
      },
      resourceToTechStack: {
        with: {
          techStack: true
        }
      },
      creator: {
        columns: {
          id: true,
          name: true,
          image: true,
          username: true
        }
      }
    }
  })

  if (!result) return null

  // Transform to flatten tags, techStack and resourceType
  const { resourceToTags: rtt, resourceToTechStack: rtts, resourceType: rt, ...rest } = result
  return {
    ...rest,
    resourceType: rt.name,
    resourceTypeId: rest.resourceTypeId,
    tags: rtt.map((r) => r.tag),
    techStack: rtts.map((r) => r.techStack)
  }
}

// ==========================================
// Get Public Resource By ID (approved + published only)
// ==========================================
export async function getPublicResourceById(id: string) {
  const result = await db.query.resource.findFirst({
    where: and(
      eq(resource.id, id),
      isNull(resource.deletedAt),
      eq(resource.status, 'approved'),
      eq(resource.isPublished, true)
    ),
    with: {
      resourceType: true,
      resourceToTags: {
        with: {
          tag: true
        }
      },
      resourceToTechStack: {
        with: {
          techStack: true
        }
      },
      creator: {
        columns: {
          id: true,
          name: true,
          image: true,
          username: true
        }
      }
    }
  })

  if (!result) return null

  // Transform to flatten tags, techStack and resourceType
  const { resourceToTags: rtt, resourceToTechStack: rtts, resourceType: rt, ...rest } = result
  return {
    ...rest,
    resourceType: rt.name,
    resourceTypeId: rest.resourceTypeId,
    tags: rtt.map((r) => r.tag),
    techStack: rtts.map((r) => r.techStack)
  }
}

// ==========================================
// Get All Resources (Cursor-based Pagination with Caching)
// ==========================================

// Helper to encode cursor
function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}_${id}`).toString('base64')
}

// Helper to decode cursor
function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8')
    const idx = decoded.lastIndexOf('_')
    if (idx <= 0) return null
    const timestamp = decoded.slice(0, idx)
    const id = decoded.slice(idx + 1)
    if (!id) return null
    const createdAt = new Date(timestamp)
    if (isNaN(createdAt.getTime())) return null
    return { createdAt, id }
  } catch {
    return null
  }
}

export async function getAllResources(query: ListResourcesInput) {
  const {
    cursor,
    limit = 20,
    resourceType,
    language,
    tag: tagName,
    techStack: techStackName,
    search,
    userId
  } = query

  // Try to get from cache first (only for non-search queries and anonymous users)
  // Skip cache for authenticated users since responses include per-user fields (userVote)
  const cacheKey = generateResourcesCacheKey(query)
  if (!search && !userId) {
    const cached = await redis.get(cacheKey)
    if (cached) {
      return JSON.parse(cached)
    }
  }

  // Build where conditions (only show approved, non-deleted resources)
  const conditions = [isNull(resource.deletedAt), eq(resource.status, 'approved')]

  if (resourceType) {
    const typeId = await getResourceTypeId(resourceType)
    if (typeId) {
      conditions.push(eq(resource.resourceTypeId, typeId))
    }
  }
  if (language) {
    conditions.push(eq(resource.language, language))
  }

  // Vector search if Gemini is configured and search term provided
  let useVectorSearch = false
  let searchEmbedding: number[] | undefined

  if (search && isGeminiConfigured()) {
    try {
      // Check Redis cache for query embedding
      const embeddingCacheKey = `search:emb:${search.toLowerCase()}`
      const cachedEmbedding = await redis.get(embeddingCacheKey)

      if (cachedEmbedding) {
        searchEmbedding = JSON.parse(cachedEmbedding as string)
      } else {
        searchEmbedding = await getEmbedding(search)
        // Cache for 24 hours
        await redis.set(embeddingCacheKey, JSON.stringify(searchEmbedding), 'EX', 86400)
      }

      // Only use vector search if embedding was successful and resources have embeddings
      conditions.push(sql`${resource.embedding} IS NOT NULL`)
      useVectorSearch = true
    } catch (error) {
      console.error('Vector search failed, falling back to ILIKE:', error)
      // Fallback to ILIKE search (escape special characters)
      const escapedSearch = escapeILikePattern(search)
      conditions.push(
        or(
          ilike(resource.title, `%${escapedSearch}%`),
          ilike(resource.description, `%${escapedSearch}%`)
        )!
      )
    }
  } else if (search) {
    // No Gemini API key, use ILIKE fallback (escape special characters)
    const escapedSearch = escapeILikePattern(search)
    conditions.push(
      or(
        ilike(resource.title, `%${escapedSearch}%`),
        ilike(resource.description, `%${escapedSearch}%`)
      )!
    )
  }

  // Handle cursor pagination
  if (cursor) {
    const decoded = decodeCursor(cursor)
    if (decoded) {
      // Get items older than cursor (createdAt < cursorDate) OR (createdAt == cursorDate AND id < cursorId)
      conditions.push(
        or(
          lt(resource.createdAt, decoded.createdAt),
          and(eq(resource.createdAt, decoded.createdAt), lt(resource.id, decoded.id))
        )!
      )
    }
  }

  // Base query for resources
  let resourceIds: string[] | undefined

  // Filter by tag name if provided
  if (tagName) {
    const tagResult = await db.select().from(tag).where(eq(tag.name, tagName)).limit(1)
    if (tagResult.length > 0 && tagResult[0]) {
      const taggedResources = await db
        .select({ resourceId: resourceToTags.resourceId })
        .from(resourceToTags)
        .where(eq(resourceToTags.tagId, tagResult[0].id))
      resourceIds = taggedResources.map((r) => r.resourceId)
    } else {
      resourceIds = []
    }
  }

  // Filter by tech stack name if provided
  if (techStackName) {
    const techResult = await db
      .select()
      .from(techStack)
      .where(eq(techStack.name, techStackName))
      .limit(1)
    if (techResult.length > 0 && techResult[0]) {
      const techResources = await db
        .select({ resourceId: resourceToTechStack.resourceId })
        .from(resourceToTechStack)
        .where(eq(resourceToTechStack.techStackId, techResult[0].id))
      const techResourceIds = techResources.map((r) => r.resourceId)

      if (resourceIds !== undefined) {
        resourceIds = resourceIds.filter((id) => techResourceIds.includes(id))
      } else {
        resourceIds = techResourceIds
      }
    } else {
      resourceIds = []
    }
  }

  // Vector search: get matching resource IDs ordered by similarity
  // Apply resourceIds filter server-side for accurate pagination
  let vectorSearchIds: string[] | undefined
  if (useVectorSearch && searchEmbedding) {
    // Build the query with optional resourceIds filter
    let vectorQuery
    if (resourceIds !== undefined && resourceIds.length > 0) {
      // Apply tag/techStack filter in the vector search query
      vectorQuery = sql`
                SELECT id, 1 - (embedding <=> ${JSON.stringify(searchEmbedding)}::vector) as similarity
                FROM resource
                WHERE deleted_at IS NULL 
                  AND status = 'approved'
                  AND is_published = true
                  AND embedding IS NOT NULL
                  AND id = ANY(${resourceIds}::text[])
                ORDER BY embedding <=> ${JSON.stringify(searchEmbedding)}::vector
                LIMIT ${limit + 1}
            `
    } else {
      vectorQuery = sql`
                SELECT id, 1 - (embedding <=> ${JSON.stringify(searchEmbedding)}::vector) as similarity
                FROM resource
                WHERE deleted_at IS NULL 
                  AND status = 'approved'
                  AND is_published = true
                  AND embedding IS NOT NULL
                ORDER BY embedding <=> ${JSON.stringify(searchEmbedding)}::vector
                LIMIT ${limit + 1}
            `
    }

    const vectorResults = await db.execute(vectorQuery)

    // Filter by similarity threshold (0.5 = 50% similar)
    vectorSearchIds = (vectorResults as unknown as { id: string; similarity: number }[])
      .filter((r) => r.similarity > 0.5)
      .map((r) => r.id)

    if (vectorSearchIds.length === 0) {
      return {
        data: [],
        nextCursor: null,
        hasMore: false
      }
    }

    // Set resourceIds to vector search results (filters already applied server-side)
    resourceIds = vectorSearchIds
  }

  if (resourceIds !== undefined) {
    if (resourceIds.length === 0) {
      const emptyResult = {
        data: [],
        nextCursor: null,
        hasMore: false
      }
      return emptyResult
    }
    conditions.push(inArray(resource.id, resourceIds))
  }

  // Fetch one extra item to determine if there are more results
  const resources = await db.query.resource.findMany({
    where: and(...conditions),
    with: {
      resourceType: true,
      resourceToTags: {
        with: {
          tag: true
        }
      },
      resourceToTechStack: {
        with: {
          techStack: true
        }
      },
      creator: {
        columns: {
          id: true,
          name: true,
          image: true,
          username: true
        }
      }
    },
    orderBy: [desc(resource.createdAt), desc(resource.id)],
    limit: limit + 1 // Fetch one extra to check hasMore
  })

  // Determine if there are more results
  const hasMore = resources.length > limit
  const items = hasMore ? resources.slice(0, limit) : resources

  // Generate next cursor from last item
  const lastItem = items[items.length - 1]
  const nextCursor = hasMore && lastItem ? encodeCursor(lastItem.createdAt, lastItem.id) : null

  // Get upvote counts from Redis for all resources
  const itemIds = items.map((r) => r.id)
  const voteCounts = await getVoteCountsBatch(itemIds)

  // Get user votes if userId is provided
  const userVotes = userId ? await getUserVotesBatch(itemIds, userId) : new Map<string, VoteState>()

  // Transform to flatten tags and techStack, add vote counts and userVote
  const data = items.map((r) => {
    const { resourceToTags: rtt, resourceToTechStack: rtts, resourceType: rt, ...rest } = r
    const counts = voteCounts.get(r.id) ?? { upvotes: r.upvoteCount, downvotes: r.downvoteCount }
    return {
      ...rest,
      resourceType: rt.name,
      resourceTypeId: rest.resourceTypeId,
      tags: rtt.map((item) => item.tag),
      techStack: rtts.map((item) => item.techStack),
      upvoteCount: counts.upvotes,
      downvoteCount: counts.downvotes,
      userVote: userVotes.get(r.id) ?? null
    }
  })

  const result = {
    data,
    nextCursor,
    hasMore
  }

  // Cache the result (skip caching for search queries and authenticated users)
  // Authenticated users have per-user fields (userVote) that shouldn't be cached under shared keys
  if (!search && !userId) {
    await redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL.RESOURCES_LIST)
  }

  return result
}

// ==========================================
// Update Resource
// ==========================================
export async function updateResource(id: string, data: UpdateResourceInput, userId: string) {
  // Check ownership
  const existing = await db
    .select()
    .from(resource)
    .where(and(eq(resource.id, id), isNull(resource.deletedAt)))
    .limit(1)

  if (existing.length === 0 || !existing[0]) {
    return { error: 'Resource not found', status: 404 }
  }

  if (existing[0].createdBy !== userId) {
    return { error: 'Not authorized to update this resource', status: 403 }
  }

  // Prevent editing published/approved resources
  if (existing[0].isPublished || existing[0].status === 'approved') {
    return { error: 'Cannot edit a published resource', status: 403 }
  }

  const {
    tags: tagNames,
    techStack: techStackNames,
    resourceType: resourceTypeName,
    ...resourceData
  } = data

  // If rejected, reset to pending for re-review (keep reason until approved)
  const updateData: Record<string, unknown> = { ...resourceData }

  // Convert resourceType name to ID if provided
  if (resourceTypeName) {
    const typeId = await getResourceTypeId(resourceTypeName)
    if (!typeId) {
      return { error: `Invalid resource type: ${resourceTypeName}`, status: 400 }
    }
    updateData.resourceTypeId = typeId
  }

  if (existing[0].status === 'rejected') {
    updateData.status = 'pending'
    // Keep the rejection reason visible until resource is approved/published
  }

  // Wrap all updates in a transaction for atomicity
  await db.transaction(async (tx) => {
    // Update the resource
    if (Object.keys(updateData).length > 0) {
      await tx.update(resource).set(updateData).where(eq(resource.id, id))
    }

    // Update tags if provided
    if (tagNames !== undefined) {
      await tx.delete(resourceToTags).where(eq(resourceToTags.resourceId, id))

      if (tagNames.length > 0) {
        const tagIds = await getOrCreateTags(tagNames, tx)
        await tx.insert(resourceToTags).values(
          tagIds.map((tagId) => ({
            resourceId: id,
            tagId
          }))
        )
      }
    }

    // Update tech stack if provided
    if (techStackNames !== undefined) {
      await tx.delete(resourceToTechStack).where(eq(resourceToTechStack.resourceId, id))

      if (techStackNames.length > 0) {
        const techStackIds = await getOrCreateTechStack(techStackNames, tx)
        await tx.insert(resourceToTechStack).values(
          techStackIds.map((techStackId) => ({
            resourceId: id,
            techStackId
          }))
        )
      }
    }
  })

  return { data: await getResourceById(id) }
}

// ==========================================
// Delete Resource (Soft Delete)
// ==========================================
export async function deleteResource(id: string, userId: string) {
  const existing = await db
    .select()
    .from(resource)
    .where(and(eq(resource.id, id), isNull(resource.deletedAt)))
    .limit(1)

  if (existing.length === 0 || !existing[0]) {
    return { error: 'Resource not found', status: 404 }
  }

  if (existing[0].createdBy !== userId) {
    return { error: 'Not authorized to delete this resource', status: 403 }
  }

  // Prevent deleting published/approved resources
  if (existing[0].isPublished || existing[0].status === 'approved') {
    return { error: 'Cannot delete a published resource', status: 403 }
  }

  await db.update(resource).set({ deletedAt: new Date() }).where(eq(resource.id, id))

  return { success: true }
}

// ==========================================
// Restore Resource
// ==========================================
export async function restoreResource(id: string, userId: string) {
  const existing = await db.select().from(resource).where(eq(resource.id, id)).limit(1)

  if (existing.length === 0 || !existing[0]) {
    return { error: 'Resource not found', status: 404 }
  }

  if (existing[0].deletedAt === null) {
    return { error: 'Resource is not deleted', status: 400 }
  }

  if (existing[0].createdBy !== userId) {
    return { error: 'Not authorized to restore this resource', status: 403 }
  }

  await db.update(resource).set({ deletedAt: null }).where(eq(resource.id, id))

  return { data: await getResourceById(id) }
}

// ==========================================
// Get User's Resources with KPIs
// ==========================================
export async function getUserResources(userId: string, query: UserResourcesInput) {
  const { page = 1, limit = 20, status, resourceType, search } = query
  const offset = (page - 1) * limit

  // Build conditions
  const conditions = [eq(resource.createdBy, userId), isNull(resource.deletedAt)]

  if (status) {
    conditions.push(eq(resource.status, status))
  }
  if (resourceType) {
    const typeId = await getResourceTypeId(resourceType)
    if (typeId) {
      conditions.push(eq(resource.resourceTypeId, typeId))
    }
  }
  if (search) {
    const escapedSearch = escapeILikePattern(search)
    conditions.push(
      or(
        ilike(resource.title, `%${escapedSearch}%`),
        ilike(resource.description, `%${escapedSearch}%`)
      )!
    )
  }

  // Get KPIs (counts by status)
  const kpiQuery = await db
    .select({
      status: resource.status,
      count: sql<number>`count(*)::int`
    })
    .from(resource)
    .where(and(eq(resource.createdBy, userId), isNull(resource.deletedAt)))
    .groupBy(resource.status)

  const kpis = {
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0
  }

  for (const row of kpiQuery) {
    kpis[row.status as keyof typeof kpis] = row.count
    kpis.total += row.count
  }

  // Get total count for pagination
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(resource)
    .where(and(...conditions))

  const total = countResult[0]?.count ?? 0
  const totalPages = Math.ceil(total / limit)

  // Get resources
  const resources = await db.query.resource.findMany({
    where: and(...conditions),
    with: {
      resourceType: true,
      resourceToTags: {
        with: { tag: true }
      },
      resourceToTechStack: {
        with: { techStack: true }
      }
    },
    orderBy: [desc(resource.createdAt)],
    limit,
    offset
  })

  // Transform response
  const data = resources.map((r) => {
    const { resourceToTags: rtt, resourceToTechStack: rtts, resourceType: rt, ...rest } = r
    return {
      ...rest,
      resourceType: rt.name,
      resourceTypeId: rest.resourceTypeId,
      tags: rtt.map((item) => item.tag),
      techStack: rtts.map((item) => item.techStack)
    }
  })

  return {
    data,
    kpis,
    meta: {
      total,
      page,
      limit,
      totalPages
    }
  }
}

// ==========================================
// Get User's Own Resource by ID (any status)
// ==========================================
export async function getUserResourceById(resourceId: string, userId: string) {
  const result = await db.query.resource.findFirst({
    where: and(
      eq(resource.id, resourceId),
      eq(resource.createdBy, userId),
      isNull(resource.deletedAt)
    ),
    with: {
      resourceType: true,
      resourceToTags: {
        with: { tag: true }
      },
      resourceToTechStack: {
        with: { techStack: true }
      }
    }
  })

  if (!result) {
    return null
  }

  // Transform response
  const { resourceToTags: rtt, resourceToTechStack: rtts, resourceType: rt, ...rest } = result
  return {
    ...rest,
    resourceType: rt.name,
    resourceTypeId: rest.resourceTypeId,
    tags: rtt.map((item) => item.tag),
    techStack: rtts.map((item) => item.techStack)
  }
}
