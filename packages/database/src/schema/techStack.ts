import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const techStack = pgTable("tech_stack", {
  id: uuid("id")
    .default(sql`uuidv7()`)
    .primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
