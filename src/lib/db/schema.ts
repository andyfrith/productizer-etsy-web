import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** Minimal P0 table; retained for health checks. */
export const appMeta = pgTable("app_meta", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/** P1 — design concepts for the studio. */
export const designConcepts = pgTable("design_concepts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  campaignLabel: text("campaign_label"),
  styleNotes: text("style_notes"),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
