import { pgTable, text, timestamp, uniqueIndex, pgEnum } from 'drizzle-orm/pg-core'
import { user } from './user'
import { resource } from './resource'

// Vote type enum
export const voteTypeEnum = pgEnum('vote_type', ['upvote', 'downvote'])

// User votes table - tracks which users voted on which resources
export const userVote = pgTable(
  'user_vote',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    resourceId: text('resource_id')
      .notNull()
      .references(() => resource.id, { onDelete: 'cascade' }),
    type: voteTypeEnum('type').notNull(), // 'upvote' or 'downvote'
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => [
    // Unique constraint: one vote per user per resource
    uniqueIndex('user_resource_vote_idx').on(table.userId, table.resourceId)
  ]
)
