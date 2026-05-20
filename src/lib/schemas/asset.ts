import { z } from "zod";

/** Maximum upload size (10 MB). */
export const MAX_ASSET_BYTES = 10 * 1024 * 1024;

/** Allowed image MIME types for reference uploads. */
export const ALLOWED_ASSET_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type AllowedAssetMimeType = (typeof ALLOWED_ASSET_MIME_TYPES)[number];

/** Rendition variants served by the file API. */
export const ASSET_VARIANTS = ["thumb", "card", "full"] as const;

export type AssetVariant = (typeof ASSET_VARIANTS)[number];

export const assetVariantSchema = z.enum(ASSET_VARIANTS);

/**
 * Validates upload MIME type against the allowlist.
 */
export function isAllowedAssetMimeType(
  mime: string,
): mime is AllowedAssetMimeType {
  return (ALLOWED_ASSET_MIME_TYPES as readonly string[]).includes(mime);
}

/**
 * Parses and validates the file route variant query param.
 */
export function parseAssetVariant(value: string | null): AssetVariant | null {
  const parsed = assetVariantSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
