import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const techStack = pgTable("tech_stack", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
