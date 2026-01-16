import { db } from '@/db'
import { resource, resourceToTags, resourceToTechStack, tag, techStack } from '@/db/schema'
import { eq, desc, isNull, and, sql, ilike, or } from 'drizzle-orm'
import { getEmbedding, buildEmbeddingText, isGeminiConfigured } from '@/lib/gemini'

interface AdminListResourcesInput {
  page?: number
  limit?: number
  status?: 'approved' | 'rejected' | 'pending'
  search?: string
}

interface UpdateResourceStatusInput {
  status: 'approved' | 'rejected'
  reason?: string
}

// ==========================================
// Get All Resources (Admin - includes all statuses)
// ==========================================
export async function adminGetAllResources(query: AdminListResourcesInput) {
  const { page = 1, limit = 20, status, search } = query
  const offset = (page - 1) * limit

  // Build conditions - exclude deleted resources by requiring resource.deletedAt to be null
  const conditions = [isNull(resource.deletedAt)]

  if (status) {
    conditions.push(eq(resource.status, status))
  }

  if (search) {
    conditions.push(
      or(
        ilike(resource.title, `%${search}%`),
        ilike(resource.description, `%${search}%`),
        ilike(resource.url, `%${search}%`)
      )!
    )
  }

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(resource)
    .where(and(...conditions))

  const total = countResult[0]?.count ?? 0
  const totalPages = Math.ceil(total / limit)

  // Get resources with creator info
  const resources = await db.query.resource.findMany({
    where: and(...conditions),
    with: {
      resourceToTags: {
        with: { tag: true }
      },
      resourceToTechStack: {
        with: { techStack: true }
      },
      creator: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
          username: true
        }
      }
    },
    orderBy: [desc(resource.createdAt)],
    limit,
    offset
  })

  // Transform response
  const data = resources.map((r) => ({
    ...r,
    tags: r.resourceToTags.map((rt) => rt.tag),
    techStack: r.resourceToTechStack.map((rts) => rts.techStack),
    resourceToTags: undefined,
    resourceToTechStack: undefined
  }))

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages
    }
  }
}

// ==========================================
// Generate Embedding for Resource
// ==========================================
async function generateResourceEmbedding(resourceId: string): Promise<number[] | null> {
  if (!isGeminiConfigured()) {
    console.warn('Gemini API key not configured, skipping embedding generation')
    return null
  }

  // Fetch resource with tags and techStack
  const resourceData = await db.query.resource.findFirst({
    where: eq(resource.id, resourceId),
    with: {
      resourceToTags: {
        with: { tag: true }
      },
      resourceToTechStack: {
        with: { techStack: true }
      }
    }
  })

  if (!resourceData) return null

  // Build embedding text
  const embeddingText = buildEmbeddingText({
    title: resourceData.title,
    resourceType: resourceData.resourceType,
    tags: resourceData.resourceToTags.map((rt) => rt.tag.name),
    techStack: resourceData.resourceToTechStack.map((rts) => rts.techStack.name)
  })

  try {
    const embedding = await getEmbedding(embeddingText)
    return embedding
  } catch (error) {
    console.error('Failed to generate embedding:', error)
    return null
  }
}

// ==========================================
// Update Resource Status (Admin)
// ==========================================
export async function adminUpdateResourceStatus(
  resourceId: string,
  input: UpdateResourceStatusInput
) {
  const { status, reason } = input

  // Check if resource exists
  const existing = await db.query.resource.findFirst({
    where: and(eq(resource.id, resourceId), isNull(resource.deletedAt))
  })

  if (!existing) {
    return { success: false, error: 'Resource not found', code: 404 }
  }

  // Generate embedding if approving
  let embedding: number[] | null = null
  if (status === 'approved') {
    embedding = await generateResourceEmbedding(resourceId)
  }

  // Update status (and embedding if generated)
  const updateData: Record<string, unknown> = {
    status,
    reason: reason ?? null,
    isPublished: status === 'approved'
  }

  if (embedding) {
    updateData.embedding = embedding
  }

  const [updated] = await db
    .update(resource)
    .set(updateData)
    .where(eq(resource.id, resourceId))
    .returning()

  return { success: true, data: updated }
}

// ==========================================
// Delete Resource (Admin)
// ==========================================
export async function adminDeleteResource(resourceId: string) {
  const existing = await db.select().from(resource).where(eq(resource.id, resourceId)).limit(1)

  if (existing.length === 0 || !existing[0]) {
    return { success: false, code: 404, error: 'Resource not found' }
  }

  if (existing[0].deletedAt !== null) {
    return { success: false, code: 400, error: 'Resource is already deleted' }
  }

  await db.update(resource).set({ deletedAt: new Date() }).where(eq(resource.id, resourceId))

  return { success: true }
}
