import { db } from "@/db";
import { logger } from "@/lib/logger";
import {
  resource,
  resourceType,
  resourceToTags,
  resourceToTechStack,
} from "@workspace/database";
import { eq, and, isNull, or, ilike, sql, desc } from "drizzle-orm";
import {
  getEmbedding,
  isGeminiConfigured,
  buildEmbeddingText,
} from "@/lib/gemini";

interface AdminListResourcesInput {
  page?: number;
  limit?: number;
  status?: "approved" | "rejected" | "pending";
  search?: string;
  resourceType?: string;
}

interface UpdateResourceStatusInput {
  status: "approved" | "rejected";
  reason?: string;
}

/**
 * Helper: Escape SQL LIKE pattern special characters
 */
function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * Generate Embedding for Resource
 */
async function generateResourceEmbedding(
  resourceId: string,
): Promise<number[] | null> {
  if (!isGeminiConfigured()) {
    logger.warn("Gemini API key not configured, skipping embedding generation");
    return null;
  }

  // Fetch resource with tags and techStack
  const resourceData = await db.query.resource.findFirst({
    where: eq(resource.id, resourceId),
    with: {
      resourceType: true,
      resourceToTags: {
        with: { tag: true },
      },
      resourceToTechStack: {
        with: { techStack: true },
      },
    },
  });

  if (!resourceData) return null;

  // Build embedding text
  const resourceTypeName = resourceData.resourceType?.name ?? "";
  const tags = (resourceData.resourceToTags ?? [])
    .map((rt) => rt.tag?.name)
    .filter((name): name is string => !!name);
  const techStack = (resourceData.resourceToTechStack ?? [])
    .map((rts) => rts.techStack?.name)
    .filter((name): name is string => !!name);

  const embeddingText = buildEmbeddingText({
    title: resourceData.title,
    resourceType: resourceTypeName,
    tags,
    techStack,
  });

  try {
    const embedding = await getEmbedding(embeddingText);
    return embedding;
  } catch (error) {
    logger.error({ err: error }, "Failed to generate embedding");
    return null;
  }
}

/**
 * Get All Resources (Admin - includes all statuses)
 */
export async function adminGetAllResources(query: AdminListResourcesInput) {
  const {
    page = 1,
    limit = 20,
    status,
    search,
    resourceType: resourceTypeName,
  } = query;

  const pageClamped = Math.max(1, page);
  const limitClamped = Math.max(1, Math.min(limit, 100));
  const offset = (pageClamped - 1) * limitClamped;

  const conditions = [isNull(resource.deletedAt)];

  if (status) {
    conditions.push(eq(resource.status, status));
  }

  if (search) {
    const escapedSearch = escapeLikePattern(search);
    conditions.push(
      or(
        ilike(resource.title, `%${escapedSearch}%`),
        ilike(resource.description, `%${escapedSearch}%`),
        ilike(resource.url, `%${escapedSearch}%`),
      )!,
    );
  }

  if (resourceTypeName) {
    const matchedType = await db.query.resourceType.findFirst({
      where: eq(resourceType.name, resourceTypeName),
      columns: { id: true },
    });

    if (!matchedType?.id) {
      return {
        data: [],
        meta: {
          total: 0,
          page: pageClamped,
          limit: limitClamped,
          totalPages: 0,
        },
      };
    }

    conditions.push(eq(resource.resourceTypeId, matchedType.id));
  }

  try {
    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(resource)
      .where(and(...conditions));

    const total = countResult[0]?.count ?? 0;
    const totalPages = Math.ceil(total / limitClamped);

    // Get resources with creator info and relations
    const resources = await db.query.resource.findMany({
      where: and(...conditions),
      with: {
        resourceToTags: {
          with: { tag: true },
        },
        resourceToTechStack: {
          with: { techStack: true },
        },
        resourceType: true,
        creator: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
            username: true,
          },
        },
      },
      orderBy: [desc(resource.createdAt)],
      limit: limitClamped,
      offset,
    });

    const data = resources.map((r) => {
      const {
        resourceToTags: rtt,
        resourceToTechStack: rtts,
        resourceType: rt,
        ...rest
      } = r;
      return {
        ...rest,
        resourceType: rt?.name ?? null,
        resourceTypeLabel: rt?.label ?? null,
        tags: rtt.map((item) => item.tag),
        techStack: rtts.map((item) => item.techStack),
      };
    });

    return {
      data,
      meta: {
        total,
        page: pageClamped,
        limit: limitClamped,
        totalPages,
      },
    };
  } catch (error) {
    logger.error({ err: error }, "Failed to fetch admin resources");
    throw error;
  }
}

/**
 * Update Resource Status (Admin)
 */
export async function adminUpdateResourceStatus(
  resourceId: string,
  input: UpdateResourceStatusInput,
) {
  const { status, reason } = input;

  const existing = await db.query.resource.findFirst({
    where: and(eq(resource.id, resourceId), isNull(resource.deletedAt)),
  });

  if (!existing) {
    return { success: false, error: "Resource not found", code: 404 };
  }

  try {
    // Generate embedding if approving
    let embedding: number[] | null = null;
    if (status === "approved") {
      embedding = await generateResourceEmbedding(resourceId);
    }

    const updateData: Record<string, unknown> = {
      status,
      reason: reason ?? null,
      isPublished: status === "approved",
    };

    if (embedding) {
      updateData.embedding = embedding;
    }

    const [updated] = await db
      .update(resource)
      .set(updateData)
      .where(eq(resource.id, resourceId))
      .returning();

    logger.info({ resourceId, status }, "Resource status updated by admin");
    return { success: true, data: updated };
  } catch (err) {
    logger.error({ err, resourceId }, "Failed to update resource status");
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to update resource status",
      code: 500,
    };
  }
}

/**
 * Delete Resource (Admin)
 */
export async function adminDeleteResource(resourceId: string) {
  const existing = await db
    .select()
    .from(resource)
    .where(eq(resource.id, resourceId))
    .limit(1);

  if (existing.length === 0 || !existing[0]) {
    return { success: false, code: 404, error: "Resource not found" };
  }

  if (existing[0].deletedAt !== null) {
    return { success: false, code: 400, error: "Resource is already deleted" };
  }

  try {
    await db
      .update(resource)
      .set({ deletedAt: new Date() })
      .where(eq(resource.id, resourceId));

    logger.info({ resourceId }, "Resource soft-deleted by admin");
    return { success: true };
  } catch (err) {
    logger.error({ err, resourceId }, "Failed to delete resource");
    return { success: false, code: 500, error: "Failed to delete resource" };
  }
}
