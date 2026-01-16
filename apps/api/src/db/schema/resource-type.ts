/**
 * Resource Type Schema
 * Admin-managed resource types for categorization
 */

import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const resourceType = pgTable('resource_type', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull().unique(), // Slug: "video", "blog"
  label: text('label').notNull(), // Display: "Video", "Blog Article"
  icon: text('icon'), // Optional icon name for UI
  createdAt: timestamp('created_at').defaultNow().notNull()
})
