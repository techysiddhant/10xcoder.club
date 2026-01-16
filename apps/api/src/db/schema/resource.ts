import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  index,
  jsonb,
  vector
} from 'drizzle-orm/pg-core'
import { user } from './user'
import { resourceType } from './resourceType'
import { ResourceLanguageSchema, ResourceStatusSchema } from '@workspace/schemas*'

// Enums
export const languageEnum = pgEnum('language', ResourceLanguageSchema.options)
export const resourceStatusEnum = pgEnum('resource_status', ResourceStatusSchema.options)

// Metadata type for JSONB column
export type ResourceMetadata = {
  // YouTube playlist
  playlistId?: string
  playlistTitle?: string
  videoCount?: number
  playlistVideos?: Array<{
    position: number
    videoId: string
    title: string
    thumbnail: string
  }>
  // YouTube video
  videoId?: string
  duration?: string
  // GitHub
  stars?: number
  language?: string
  topics?: string[]
  // Blog
  readingTime?: number
  publishedAt?: string
}

export const resource = pgTable(
  'resource',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text('title').notNull(),
    description: text('description'),
    url: text('url').notNull(),
    image: text('image'),
    credits: text('credits'), // Original author/source attribution
    creditsUrl: text('credits_url'), // Original author profile url
    // Categorization (FK to resource_type.id)
    resourceTypeId: text('resource_type_id')
      .notNull()
      .references(() => resourceType.id),
    language: languageEnum('language').default('english').notNull(),

    // Moderation
    status: resourceStatusEnum('status').default('pending').notNull(),
    reason: text('reason'),
    isPublished: boolean('is_published').default(false).notNull(),

    // Engagement
    upvoteCount: integer('upvote_count').default(0).notNull(),
    downvoteCount: integer('downvote_count').default(0).notNull(),

    // Platform-specific metadata (JSONB)
    metadata: jsonb('metadata').$type<ResourceMetadata>(),

    // Semantic search embedding (768 dimensions from Gemini text-embedding-004)
    embedding: vector('embedding', { dimensions: 768 }),

    // Ownership
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id),

    // Timestamps (including soft delete)
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at')
  },
  (table) => [
    index('resource_status_idx').on(table.status),
    index('resource_created_by_idx').on(table.createdBy),
    index('resource_deleted_at_idx').on(table.deletedAt),
    index('resource_type_id_idx').on(table.resourceTypeId),
    // HNSW index for vector similarity search (cosine distance)
    // Note: Requires pgvector extension. Index uses cosine operator class to match <=> similarity queries.
    index('resource_embedding_hnsw_idx').using('hnsw', table.embedding.op('vector_cosine_ops'))
  ]
)
