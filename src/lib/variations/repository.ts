import fs from "node:fs/promises";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import {
  getAssetById,
  getAssetVariantAbsolutePath,
} from "@/lib/assets/repository";
import { conceptVariations, designConcepts } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { processImageRenditions } from "@/lib/variations/process-image";
import {
  resolveStoragePath,
  variationStorageBaseKey,
  variationVariantKey,
} from "@/lib/variations/storage-paths";
import type { VariationDto, VariationStatus } from "@/lib/variations/types";
import type { AssetVariant } from "@/lib/schemas/asset";
import {
  shouldClearApprovedVariationId,
  variationIdsToDemoteOnApprove,
} from "@/lib/schemas/variation";
import { ensureStorageRoot } from "@/lib/storage";

type VariationRow = typeof conceptVariations.$inferSelect;

/**
 * Maps a Drizzle row to the public API shape.
 */
export function mapVariationRow(row: VariationRow): VariationDto {
  return {
    id: row.id,
    conceptId: row.conceptId,
    parentVariationId: row.parentVariationId,
    sourceAssetId: row.sourceAssetId,
    status: row.status as VariationStatus,
    promptSnapshot: row.promptSnapshot,
    storageKey: row.storageKey,
    thumbKey: row.thumbKey,
    cardKey: row.cardKey,
    fullKey: row.fullKey,
    byteSize: row.byteSize,
    width: row.width,
    height: row.height,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    thumbUrl: `/api/variations/${row.id}/file?variant=thumb`,
  };
}

/**
 * Fetches variation metadata by id.
 */
export async function getVariationById(
  id: string,
): Promise<VariationDto | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(conceptVariations)
    .where(eq(conceptVariations.id, id))
    .limit(1);

  return row ? mapVariationRow(row) : null;
}

/**
 * Lists variations for a concept (newest first).
 */
export async function listVariationsByConceptId(
  conceptId: string,
): Promise<VariationDto[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(conceptVariations)
    .where(eq(conceptVariations.conceptId, conceptId))
    .orderBy(desc(conceptVariations.createdAt));

  return rows.map(mapVariationRow);
}

/**
 * Resolves the absolute filesystem path for a rendition file.
 */
export function getVariationVariantAbsolutePath(
  variation: VariationDto,
  variant: AssetVariant,
): string {
  const root = ensureStorageRoot();
  const key =
    variant === "thumb"
      ? variation.thumbKey
      : variant === "card"
        ? variation.cardKey
        : variation.fullKey;

  return resolveStoragePath(root, key);
}

async function assertParentVariationForConcept(
  conceptId: string,
  parentVariationId: string | undefined,
): Promise<boolean> {
  if (!parentVariationId) {
    return true;
  }

  const parent = await getVariationById(parentVariationId);

  return Boolean(parent && parent.conceptId === conceptId);
}

async function writeVariationRenditions(
  variationId: string,
  renditions: Awaited<ReturnType<typeof processImageRenditions>>,
): Promise<{
  storageKey: string;
  thumbKey: string;
  cardKey: string;
  fullKey: string;
}> {
  const storageRoot = ensureStorageRoot();
  const storageKey = variationStorageBaseKey(variationId);
  const thumbKey = variationVariantKey(variationId, "thumb");
  const cardKey = variationVariantKey(variationId, "card");
  const fullKey = variationVariantKey(variationId, "full");

  const dir = resolveStoragePath(storageRoot, storageKey);
  await fs.mkdir(dir, { recursive: true });

  await Promise.all([
    fs.writeFile(resolveStoragePath(storageRoot, thumbKey), renditions.thumb),
    fs.writeFile(resolveStoragePath(storageRoot, cardKey), renditions.card),
    fs.writeFile(resolveStoragePath(storageRoot, fullKey), renditions.full),
  ]);

  return { storageKey, thumbKey, cardKey, fullKey };
}

export interface CreateVariationUploadInput {
  conceptId: string;
  buffer: Buffer;
  byteSize: number;
  parentVariationId?: string;
}

/**
 * Processes an upload and persists a new variation for a concept.
 */
export async function createVariationFromUpload(
  input: CreateVariationUploadInput,
): Promise<VariationDto | null> {
  if (
    !(await assertParentVariationForConcept(
      input.conceptId,
      input.parentVariationId,
    ))
  ) {
    return null;
  }

  const db = getDb();
  const renditions = await processImageRenditions(input.buffer);

  const [row] = await db
    .insert(conceptVariations)
    .values({
      conceptId: input.conceptId,
      parentVariationId: input.parentVariationId ?? null,
      status: "pending",
      storageKey: "",
      thumbKey: "",
      cardKey: "",
      fullKey: "",
      byteSize: input.byteSize,
      width: renditions.width || null,
      height: renditions.height || null,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create variation");
  }

  const keys = await writeVariationRenditions(row.id, renditions);

  const [updated] = await db
    .update(conceptVariations)
    .set({ ...keys, updatedAt: new Date() })
    .where(eq(conceptVariations.id, row.id))
    .returning();

  if (!updated) {
    throw new Error("Failed to update variation keys");
  }

  await db
    .update(designConcepts)
    .set({ updatedAt: new Date() })
    .where(eq(designConcepts.id, input.conceptId));

  return mapVariationRow(updated);
}

export interface CreateVariationFromAssetInput {
  conceptId: string;
  assetId: string;
  parentVariationId?: string;
}

/**
 * Seeds a variation by copying renditions from a concept reference asset.
 */
export async function createVariationFromAsset(
  input: CreateVariationFromAssetInput,
): Promise<VariationDto | null> {
  const asset = await getAssetById(input.assetId);

  if (
    !asset ||
    asset.conceptId !== input.conceptId ||
    asset.archivedAt !== null
  ) {
    return null;
  }

  if (
    !(await assertParentVariationForConcept(
      input.conceptId,
      input.parentVariationId,
    ))
  ) {
    return null;
  }

  const storageRoot = ensureStorageRoot();
  const db = getDb();

  const [row] = await db
    .insert(conceptVariations)
    .values({
      conceptId: input.conceptId,
      parentVariationId: input.parentVariationId ?? null,
      sourceAssetId: input.assetId,
      status: "pending",
      storageKey: "",
      thumbKey: "",
      cardKey: "",
      fullKey: "",
      byteSize: asset.byteSize,
      width: asset.width,
      height: asset.height,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create variation from asset");
  }

  const keys = {
    storageKey: variationStorageBaseKey(row.id),
    thumbKey: variationVariantKey(row.id, "thumb"),
    cardKey: variationVariantKey(row.id, "card"),
    fullKey: variationVariantKey(row.id, "full"),
  };

  const dir = resolveStoragePath(storageRoot, keys.storageKey);
  await fs.mkdir(dir, { recursive: true });

  for (const variant of ["thumb", "card", "full"] as const) {
    const src = getAssetVariantAbsolutePath(asset, variant);
    const dest = resolveStoragePath(
      storageRoot,
      keys[`${variant}Key` as "thumbKey" | "cardKey" | "fullKey"],
    );
    await fs.copyFile(src, dest);
  }

  const [updated] = await db
    .update(conceptVariations)
    .set({ ...keys, updatedAt: new Date() })
    .where(eq(conceptVariations.id, row.id))
    .returning();

  if (!updated) {
    throw new Error("Failed to update variation keys");
  }

  await db
    .update(designConcepts)
    .set({ updatedAt: new Date() })
    .where(eq(designConcepts.id, input.conceptId));

  return mapVariationRow(updated);
}

/**
 * Updates variation status with single-approved semantics per concept.
 */
export async function updateVariationStatus(
  conceptId: string,
  variationId: string,
  status: VariationStatus,
): Promise<VariationDto | null> {
  const db = getDb();
  const existing = await getVariationById(variationId);

  if (!existing || existing.conceptId !== conceptId) {
    return null;
  }

  const now = new Date();

  if (status === "approved") {
    const all = await listVariationsByConceptId(conceptId);
    const demoteIds = variationIdsToDemoteOnApprove(all, variationId);

    await db.transaction(async (tx) => {
      if (demoteIds.length > 0) {
        await tx
          .update(conceptVariations)
          .set({ status: "pending", updatedAt: now })
          .where(
            and(
              eq(conceptVariations.conceptId, conceptId),
              inArray(conceptVariations.id, demoteIds),
            ),
          );
      }

      await tx
        .update(conceptVariations)
        .set({ status: "approved", updatedAt: now })
        .where(
          and(
            eq(conceptVariations.id, variationId),
            eq(conceptVariations.conceptId, conceptId),
          ),
        );

      await tx
        .update(designConcepts)
        .set({
          approvedVariationId: variationId,
          updatedAt: now,
        })
        .where(eq(designConcepts.id, conceptId));
    });
  } else {
    const [concept] = await db
      .select({ approvedVariationId: designConcepts.approvedVariationId })
      .from(designConcepts)
      .where(eq(designConcepts.id, conceptId))
      .limit(1);

    const clearApproved = shouldClearApprovedVariationId(
      concept?.approvedVariationId ?? null,
      variationId,
      status,
    );

    await db.transaction(async (tx) => {
      await tx
        .update(conceptVariations)
        .set({ status, updatedAt: now })
        .where(
          and(
            eq(conceptVariations.id, variationId),
            eq(conceptVariations.conceptId, conceptId),
          ),
        );

      if (clearApproved) {
        await tx
          .update(designConcepts)
          .set({ approvedVariationId: null, updatedAt: now })
          .where(eq(designConcepts.id, conceptId));
      } else {
        await tx
          .update(designConcepts)
          .set({ updatedAt: now })
          .where(eq(designConcepts.id, conceptId));
      }
    });
  }

  return getVariationById(variationId);
}

/**
 * Returns true when a concept exists and is not archived.
 */
export async function conceptAcceptsVariations(
  conceptId: string,
): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ status: designConcepts.status })
    .from(designConcepts)
    .where(
      and(eq(designConcepts.id, conceptId), ne(designConcepts.status, "archived")),
    )
    .limit(1);

  return Boolean(row);
}
