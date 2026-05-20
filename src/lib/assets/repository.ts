import fs from "node:fs/promises";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { designAssets, designConcepts } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { processImageRenditions } from "@/lib/assets/process-image";
import {
  assetStorageBaseKey,
  assetVariantKey,
  resolveStoragePath,
} from "@/lib/assets/storage-paths";
import type { AssetDto } from "@/lib/assets/types";
import type { AssetVariant } from "@/lib/schemas/asset";
import { ensureStorageRoot } from "@/lib/storage";

type AssetRow = typeof designAssets.$inferSelect;

/**
 * Maps a Drizzle row to the public API shape.
 */
export function mapAssetRow(row: AssetRow): AssetDto {
  return {
    id: row.id,
    conceptId: row.conceptId,
    originalFilename: row.originalFilename,
    mimeType: row.mimeType,
    storageKey: row.storageKey,
    thumbKey: row.thumbKey,
    cardKey: row.cardKey,
    fullKey: row.fullKey,
    byteSize: row.byteSize,
    width: row.width,
    height: row.height,
    createdAt: row.createdAt.toISOString(),
    archivedAt: row.archivedAt?.toISOString() ?? null,
  };
}

/**
 * Fetches asset metadata by id (active or archived).
 */
export async function getAssetById(id: string): Promise<AssetDto | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(designAssets)
    .where(eq(designAssets.id, id))
    .limit(1);

  return row ? mapAssetRow(row) : null;
}

export interface ListAssetsOptions {
  /** When true, returns archived references only; otherwise active only. */
  archived?: boolean;
}

/**
 * Lists reference assets linked to a concept (newest first).
 */
export async function listAssetsByConceptId(
  conceptId: string,
  options?: ListAssetsOptions,
): Promise<AssetDto[]> {
  const db = getDb();
  const archived = options?.archived ?? false;

  const rows = await db
    .select()
    .from(designAssets)
    .where(
      and(
        eq(designAssets.conceptId, conceptId),
        archived
          ? isNotNull(designAssets.archivedAt)
          : isNull(designAssets.archivedAt),
      ),
    )
    .orderBy(desc(designAssets.createdAt));

  return rows.map(mapAssetRow);
}

/**
 * Resolves the absolute filesystem path for a rendition file.
 */
export function getAssetVariantAbsolutePath(
  asset: AssetDto,
  variant: AssetVariant,
): string {
  const root = ensureStorageRoot();
  const key =
    variant === "thumb"
      ? asset.thumbKey
      : variant === "card"
        ? asset.cardKey
        : asset.fullKey;

  return resolveStoragePath(root, key);
}

export interface CreateAssetInput {
  buffer: Buffer;
  originalFilename: string;
  mimeType: string;
  conceptId?: string;
}

/**
 * Reassigns preview to the newest active reference when the current preview is cleared.
 */
async function reassignPreviewFromActiveAssets(
  conceptId: string,
  clearedPreviewId: string,
): Promise<void> {
  const db = getDb();
  const [concept] = await db
    .select({ previewAssetId: designConcepts.previewAssetId })
    .from(designConcepts)
    .where(eq(designConcepts.id, conceptId))
    .limit(1);

  if (!concept || concept.previewAssetId !== clearedPreviewId) {
    return;
  }

  const [next] = await db
    .select({ id: designAssets.id })
    .from(designAssets)
    .where(
      and(
        eq(designAssets.conceptId, conceptId),
        isNull(designAssets.archivedAt),
      ),
    )
    .orderBy(desc(designAssets.createdAt))
    .limit(1);

  await db
    .update(designConcepts)
    .set({
      previewAssetId: next?.id ?? null,
      updatedAt: new Date(),
    })
    .where(eq(designConcepts.id, conceptId));
}

/**
 * Processes an upload, writes renditions to disk, and links to a concept.
 * Sets preview only when the concept has no preview yet.
 */
export async function createAssetFromUpload(
  input: CreateAssetInput,
): Promise<AssetDto> {
  const db = getDb();
  const storageRoot = ensureStorageRoot();
  const renditions = await processImageRenditions(input.buffer);

  const [row] = await db
    .insert(designAssets)
    .values({
      conceptId: input.conceptId ?? null,
      originalFilename: input.originalFilename,
      mimeType: input.mimeType,
      storageKey: "",
      thumbKey: "",
      cardKey: "",
      fullKey: "",
      byteSize: input.buffer.byteLength,
      width: renditions.width || null,
      height: renditions.height || null,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create asset");
  }

  const baseKey = assetStorageBaseKey(row.id);
  const thumbKey = assetVariantKey(row.id, "thumb");
  const cardKey = assetVariantKey(row.id, "card");
  const fullKey = assetVariantKey(row.id, "full");

  const dir = resolveStoragePath(storageRoot, baseKey);
  await fs.mkdir(dir, { recursive: true });

  await Promise.all([
    fs.writeFile(resolveStoragePath(storageRoot, thumbKey), renditions.thumb),
    fs.writeFile(resolveStoragePath(storageRoot, cardKey), renditions.card),
    fs.writeFile(resolveStoragePath(storageRoot, fullKey), renditions.full),
  ]);

  const [updated] = await db
    .update(designAssets)
    .set({
      storageKey: baseKey,
      thumbKey,
      cardKey,
      fullKey,
    })
    .where(eq(designAssets.id, row.id))
    .returning();

  if (!updated) {
    throw new Error("Failed to update asset keys");
  }

  if (input.conceptId) {
    const [concept] = await db
      .select({ previewAssetId: designConcepts.previewAssetId })
      .from(designConcepts)
      .where(eq(designConcepts.id, input.conceptId))
      .limit(1);

    if (concept && !concept.previewAssetId) {
      await db
        .update(designConcepts)
        .set({
          previewAssetId: updated.id,
          updatedAt: new Date(),
        })
        .where(eq(designConcepts.id, input.conceptId));
    } else {
      await db
        .update(designConcepts)
        .set({ updatedAt: new Date() })
        .where(eq(designConcepts.id, input.conceptId));
    }
  }

  return mapAssetRow(updated);
}

/**
 * Archives a reference asset (soft remove). Reassigns preview if needed.
 */
export async function archiveAssetForConcept(
  assetId: string,
  conceptId: string,
): Promise<boolean> {
  const db = getDb();
  const asset = await getAssetById(assetId);

  if (
    !asset ||
    asset.conceptId !== conceptId ||
    asset.archivedAt !== null
  ) {
    return false;
  }

  await db
    .update(designAssets)
    .set({ archivedAt: new Date() })
    .where(eq(designAssets.id, assetId));

  await reassignPreviewFromActiveAssets(conceptId, assetId);

  await db
    .update(designConcepts)
    .set({ updatedAt: new Date() })
    .where(eq(designConcepts.id, conceptId));

  return true;
}

/**
 * Restores an archived reference asset to the active library.
 */
export async function restoreAssetForConcept(
  assetId: string,
  conceptId: string,
): Promise<boolean> {
  const db = getDb();
  const asset = await getAssetById(assetId);

  if (
    !asset ||
    asset.conceptId !== conceptId ||
    asset.archivedAt === null
  ) {
    return false;
  }

  await db
    .update(designAssets)
    .set({ archivedAt: null })
    .where(eq(designAssets.id, assetId));

  const [concept] = await db
    .select({ previewAssetId: designConcepts.previewAssetId })
    .from(designConcepts)
    .where(eq(designConcepts.id, conceptId))
    .limit(1);

  if (concept && !concept.previewAssetId) {
    await db
      .update(designConcepts)
      .set({
        previewAssetId: assetId,
        updatedAt: new Date(),
      })
      .where(eq(designConcepts.id, conceptId));
  } else {
    await db
      .update(designConcepts)
      .set({ updatedAt: new Date() })
      .where(eq(designConcepts.id, conceptId));
  }

  return true;
}

/**
 * Permanently deletes an archived asset and its files.
 */
export async function permanentlyDeleteAssetForConcept(
  assetId: string,
  conceptId: string,
): Promise<boolean> {
  const db = getDb();
  const asset = await getAssetById(assetId);

  if (
    !asset ||
    asset.conceptId !== conceptId ||
    asset.archivedAt === null
  ) {
    return false;
  }

  const storageRoot = ensureStorageRoot();

  for (const key of [asset.thumbKey, asset.cardKey, asset.fullKey]) {
    try {
      await fs.unlink(resolveStoragePath(storageRoot, key));
    } catch {
      // File may already be missing
    }
  }

  try {
    await fs.rm(resolveStoragePath(storageRoot, asset.storageKey), {
      recursive: true,
      force: true,
    });
  } catch {
    // Directory may already be missing
  }

  await db.delete(designAssets).where(eq(designAssets.id, assetId));

  const [conceptRow] = await db
    .select({ previewAssetId: designConcepts.previewAssetId })
    .from(designConcepts)
    .where(eq(designConcepts.id, conceptId))
    .limit(1);

  if (conceptRow?.previewAssetId === assetId) {
    await db
      .update(designConcepts)
      .set({ previewAssetId: null, updatedAt: new Date() })
      .where(eq(designConcepts.id, conceptId));
  } else {
    await db
      .update(designConcepts)
      .set({ updatedAt: new Date() })
      .where(eq(designConcepts.id, conceptId));
  }

  return true;
}
