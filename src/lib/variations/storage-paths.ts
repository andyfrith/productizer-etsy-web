import path from "node:path";
import type { AssetVariant } from "@/lib/schemas/asset";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const VARIANT_FILES: Record<AssetVariant, string> = {
  thumb: "thumb.webp",
  card: "card.webp",
  full: "full.webp",
};

/**
 * Returns true when the value is a valid UUID v4-style string.
 */
export function isValidVariationId(variationId: string): boolean {
  return UUID_RE.test(variationId);
}

/**
 * Relative storage key for a variation directory (under STORAGE_ROOT).
 */
export function variationStorageBaseKey(variationId: string): string {
  if (!isValidVariationId(variationId)) {
    throw new Error("Invalid variation id");
  }
  return `variations/${variationId}`;
}

/**
 * Relative storage key for a variation rendition file.
 */
export function variationVariantKey(
  variationId: string,
  variant: AssetVariant,
): string {
  const base = variationStorageBaseKey(variationId);
  return `${base}/${VARIANT_FILES[variant]}`;
}

/**
 * Resolves a relative key to an absolute path and ensures it stays under root.
 */
export function resolveStoragePath(
  storageRoot: string,
  relativeKey: string,
): string {
  const normalizedRoot = path.resolve(storageRoot);
  const absolute = path.resolve(normalizedRoot, relativeKey);

  if (
    absolute !== normalizedRoot &&
    !absolute.startsWith(`${normalizedRoot}${path.sep}`)
  ) {
    throw new Error("Invalid storage path");
  }

  return absolute;
}
