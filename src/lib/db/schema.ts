import {
  type AnyPgColumn,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

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
  /** P2 — chosen preview image among concept reference assets. */
  previewAssetId: uuid("preview_asset_id"),
  /** P3 — winning variation candidate for this concept. */
  approvedVariationId: uuid("approved_variation_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** P2 — uploaded reference images and renditions. */
export const designAssets = pgTable("design_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  conceptId: uuid("concept_id").references(() => designConcepts.id, {
    onDelete: "set null",
  }),
  originalFilename: text("original_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  storageKey: text("storage_key").notNull(),
  thumbKey: text("thumb_key").notNull(),
  cardKey: text("card_key").notNull(),
  fullKey: text("full_key").notNull(),
  byteSize: integer("byte_size").notNull(),
  width: integer("width"),
  height: integer("height"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  /** When set, hidden from active references (shown under Archived). */
  archivedAt: timestamp("archived_at", { withTimezone: true }),
});

/** P3 — art-direction variations with optional lineage. */
export const conceptVariations = pgTable("concept_variations", {
  id: uuid("id").primaryKey().defaultRandom(),
  conceptId: uuid("concept_id")
    .notNull()
    .references(() => designConcepts.id, { onDelete: "cascade" }),
  parentVariationId: uuid("parent_variation_id").references(
    (): AnyPgColumn => conceptVariations.id,
    { onDelete: "set null" },
  ),
  sourceAssetId: uuid("source_asset_id").references(() => designAssets.id, {
    onDelete: "set null",
  }),
  status: text("status").notNull().default("pending"),
  /** Reserved for P4 AI generation metadata. */
  promptSnapshot: text("prompt_snapshot"),
  storageKey: text("storage_key").notNull(),
  thumbKey: text("thumb_key").notNull(),
  cardKey: text("card_key").notNull(),
  fullKey: text("full_key").notNull(),
  byteSize: integer("byte_size").notNull(),
  width: integer("width"),
  height: integer("height"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
