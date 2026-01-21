/**
 * Resource Type Service
 * CRUD operations for admin-managed resource types
 */

import { db } from '@/db'
import { resourceType } from '@/db/schema'
import { eq } from 'drizzle-orm'

export type ResourceTypeInput = {
  name: string
  label: string
  icon?: string
}

/**
 * Get all resource types
 */
export async function getAllResourceTypes() {
  return db.select().from(resourceType).orderBy(resourceType.name)
}

/**
 * Get a resource type by name
 */
export async function getResourceTypeByName(name: string) {
  const result = await db.select().from(resourceType).where(eq(resourceType.name, name)).limit(1)
  return result[0] ?? null
}

/**
 * Create a new resource type
 * Throws Error with descriptive message on unique constraint violation
 */
export async function createResourceType(input: ResourceTypeInput) {
  try {
    const result = await db.insert(resourceType).values(input).returning()
    return result[0] ?? null
  } catch (error) {
    const dbError = error as { code?: string; constraint?: string }
    // Postgres unique violation code
    if (dbError.code === '23505') {
      throw new Error(`Resource type with name "${input.name}" already exists`)
    }
    throw error
  }
}

/**
 * Update a resource type
 * Returns null if not found, throws Error on empty input or name conflict
 */
export async function updateResourceType(id: string, input: Partial<ResourceTypeInput>) {
  // Guard against empty input
  const hasUpdatableFields = Object.keys(input).length > 0
  if (!hasUpdatableFields) {
    throw new Error('No fields provided to update')
  }

  // Check name uniqueness if name is being updated
  if (input.name) {
    const existing = await db
      .select({ id: resourceType.id })
      .from(resourceType)
      .where(eq(resourceType.name, input.name))
      .limit(1)

    if (existing.length > 0 && existing[0]?.id !== id) {
      throw new Error(`Resource type with name "${input.name}" already exists`)
    }
  }
  // Perform update with DB-level unique constraint handling as backup for race conditions
  try {
    const result = await db
      .update(resourceType)
      .set(input)
      .where(eq(resourceType.id, id))
      .returning()
    return result[0] ?? null
  } catch (error) {
    const dbError = error as { code?: string }
    // Postgres unique violation code
    if (dbError.code === '23505') {
      throw new Error(`Resource type with name "${input.name}" already exists`)
    }
    throw error
  }
}

/**
 * Delete a resource type
 */
export async function deleteResourceType(id: string) {
  const result = await db.delete(resourceType).where(eq(resourceType.id, id)).returning()
  return result[0] ?? null
}

/**
 * Check if a resource type name exists (lightweight check - only selects id)
 */
// export async function resourceTypeExists(name: string): Promise<boolean> {
//   const result = await db
//     .select({ id: resourceType.id })
//     .from(resourceType)
//     .where(eq(resourceType.name, name))
//     .limit(1)
//   return result.length > 0
// }
