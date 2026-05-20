import { describe, expect, it } from "vitest";
import {
  assetVariantSchema,
  isAllowedAssetMimeType,
  MAX_ASSET_BYTES,
  parseAssetVariant,
} from "@/lib/schemas/asset";
import {
  assetStorageBaseKey,
  assetVariantKey,
  isValidAssetId,
} from "@/lib/assets/storage-paths";

describe("asset upload schema", () => {
  it("allows png, jpeg, and webp", () => {
    expect(isAllowedAssetMimeType("image/png")).toBe(true);
    expect(isAllowedAssetMimeType("image/jpeg")).toBe(true);
    expect(isAllowedAssetMimeType("image/webp")).toBe(true);
    expect(isAllowedAssetMimeType("image/gif")).toBe(false);
  });

  it("parses valid variants", () => {
    expect(parseAssetVariant("thumb")).toBe("thumb");
    expect(parseAssetVariant("invalid")).toBeNull();
  });

  it("validates variant enum", () => {
    expect(assetVariantSchema.safeParse("card").success).toBe(true);
    expect(assetVariantSchema.safeParse("xlarge").success).toBe(false);
  });

  it("defines 10 MB max size", () => {
    expect(MAX_ASSET_BYTES).toBe(10 * 1024 * 1024);
  });
});

describe("asset storage paths", () => {
  const assetId = "550e8400-e29b-41d4-a716-446655440000";

  it("validates asset ids", () => {
    expect(isValidAssetId(assetId)).toBe(true);
    expect(isValidAssetId("../etc/passwd")).toBe(false);
  });

  it("builds safe relative keys", () => {
    expect(assetStorageBaseKey(assetId)).toBe(
      `assets/${assetId}`,
    );
    expect(assetVariantKey(assetId, "thumb")).toBe(
      `assets/${assetId}/thumb.webp`,
    );
  });
});
