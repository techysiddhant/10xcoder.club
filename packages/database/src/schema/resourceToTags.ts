import { pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { resource } from "./resource";
import { tag } from "./tag";

export const resourceToTags = pgTable(
  "resource_to_tags",
  {
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resource.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.resourceId, t.tagId] })],
);
