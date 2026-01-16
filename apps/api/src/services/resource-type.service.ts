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
 */
export async function createResourceType(input: ResourceTypeInput) {
  const result = await db.insert(resourceType).values(input).returning()
  return result[0]!
}

/**
 * Update a resource type
 */
export async function updateResourceType(id: string, input: Partial<ResourceTypeInput>) {
  const result = await db.update(resourceType).set(input).where(eq(resourceType.id, id)).returning()
  return result[0] ?? null
}

/**
 * Delete a resource type
 */
export async function deleteResourceType(id: string) {
  const result = await db.delete(resourceType).where(eq(resourceType.id, id)).returning()
  return result[0] ?? null
}

/**
 * Check if a resource type name exists
 */
export async function resourceTypeExists(name: string): Promise<boolean> {
  const result = await getResourceTypeByName(name)
  return result !== null
}
