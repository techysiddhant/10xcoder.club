import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";
import { user } from "./user";
import { resource } from "./resource";

export const voteTypeEnum = pgEnum("vote_type", ["upvote", "downvote"]);

export const userVote = pgTable(
  "user_vote",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    resourceId: text("resource_id")
      .notNull()
      .references(() => resource.id, { onDelete: "cascade" }),
    type: voteTypeEnum("type").notNull(), // 'upvote' or 'downvote'
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("user_resource_vote_idx").on(table.userId, table.resourceId),
  ],
);
