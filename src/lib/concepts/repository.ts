import { and, desc, eq, ne } from "drizzle-orm";
import { getAssetById } from "@/lib/assets/repository";
import { designConcepts } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import type { ConceptDto, ConceptStatus } from "@/lib/concepts/types";
import type { ConceptFormValues } from "@/lib/schemas/concept";

type ConceptRow = typeof designConcepts.$inferSelect;

/**
 * Maps a Drizzle row to the public API shape.
 */
export function mapConceptRow(row: ConceptRow): ConceptDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    campaignLabel: row.campaignLabel,
    styleNotes: row.styleNotes,
    status: row.status as ConceptStatus,
    previewAssetId: row.previewAssetId,
    approvedVariationId: row.approvedVariationId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Lists concepts, excluding archived unless requested.
 */
export async function listConcepts(options?: {
  includeArchived?: boolean;
}): Promise<ConceptDto[]> {
  const db = getDb();
  const conditions = options?.includeArchived
    ? undefined
    : ne(designConcepts.status, "archived");

  const base = db.select().from(designConcepts);
  const rows = await (conditions
    ? base.where(conditions)
    : base
  ).orderBy(desc(designConcepts.updatedAt));

  return rows.map(mapConceptRow);
}

/**
 * Fetches a single concept by id.
 */
export async function getConceptById(id: string): Promise<ConceptDto | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(designConcepts)
    .where(eq(designConcepts.id, id))
    .limit(1);

  return row ? mapConceptRow(row) : null;
}

/**
 * Creates a new concept with status draft.
 */
export async function createConcept(
  input: ConceptFormValues,
): Promise<ConceptDto> {
  const db = getDb();
  const [row] = await db
    .insert(designConcepts)
    .values({
      name: input.name,
      description: input.description ?? null,
      campaignLabel: input.campaignLabel ?? null,
      styleNotes: input.styleNotes ?? null,
      status: "draft",
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create concept");
  }

  return mapConceptRow(row);
}

/**
 * Updates editable fields on a concept.
 */
export async function updateConcept(
  id: string,
  input: Partial<ConceptFormValues>,
): Promise<ConceptDto | null> {
  const db = getDb();
  const patch: Partial<typeof designConcepts.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) {
    patch.description = input.description ?? null;
  }
  if (input.campaignLabel !== undefined) {
    patch.campaignLabel = input.campaignLabel ?? null;
  }
  if (input.styleNotes !== undefined) {
    patch.styleNotes = input.styleNotes ?? null;
  }

  const [row] = await db
    .update(designConcepts)
    .set(patch)
    .where(and(eq(designConcepts.id, id), ne(designConcepts.status, "archived")))
    .returning();

  return row ? mapConceptRow(row) : null;
}

/**
 * Sets which reference asset is the concept preview (must belong to the concept).
 */
export async function setConceptPreviewAsset(
  conceptId: string,
  assetId: string,
): Promise<ConceptDto | null> {
  const asset = await getAssetById(assetId);

  if (!asset || asset.conceptId !== conceptId || asset.archivedAt !== null) {
    return null;
  }

  const db = getDb();
  const [row] = await db
    .update(designConcepts)
    .set({ previewAssetId: assetId, updatedAt: new Date() })
    .where(
      and(eq(designConcepts.id, conceptId), ne(designConcepts.status, "archived")),
    )
    .returning();

  return row ? mapConceptRow(row) : null;
}

/**
 * Soft-deletes a concept by setting status to archived.
 */
export async function archiveConcept(id: string): Promise<ConceptDto | null> {
  const db = getDb();
  const [row] = await db
    .update(designConcepts)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(designConcepts.id, id))
    .returning();

  return row ? mapConceptRow(row) : null;
}
