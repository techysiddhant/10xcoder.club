import { pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { resource } from "./resource";
import { techStack } from "./techStack";

export const resourceToTechStack = pgTable(
  "resource_to_tech_stack",
  {
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resource.id, { onDelete: "cascade" }),
    techStackId: uuid("tech_stack_id")
      .notNull()
      .references(() => techStack.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.resourceId, t.techStackId] })],
);
