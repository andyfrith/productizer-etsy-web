import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** Minimal P0 table; P1 adds design_concepts. */
export const appMeta = pgTable("app_meta", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
