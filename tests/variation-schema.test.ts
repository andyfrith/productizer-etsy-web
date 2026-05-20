import { describe, expect, it } from "vitest";
import {
  createVariationFromAssetSchema,
  patchVariationStatusSchema,
  shouldClearApprovedVariationId,
  variationIdsToDemoteOnApprove,
  variationStatusSchema,
} from "@/lib/schemas/variation";
import {
  isValidVariationId,
  variationStorageBaseKey,
  variationVariantKey,
} from "@/lib/variations/storage-paths";

describe("variation schema", () => {
  it("validates status enum", () => {
    expect(variationStatusSchema.safeParse("approved").success).toBe(true);
    expect(variationStatusSchema.safeParse("unknown").success).toBe(false);
  });

  it("validates patch and from-asset bodies", () => {
    expect(
      patchVariationStatusSchema.safeParse({ status: "rejected" }).success,
    ).toBe(true);
    expect(
      createVariationFromAssetSchema.safeParse({
        assetId: "550e8400-e29b-41d4-a716-446655440000",
      }).success,
    ).toBe(true);
  });
});

describe("single-approved helpers", () => {
  const variations = [
    { id: "a", status: "approved" as const },
    { id: "b", status: "pending" as const },
    { id: "c", status: "approved" as const },
  ];

  it("demotes other approved variations when approving", () => {
    expect(variationIdsToDemoteOnApprove(variations, "b")).toEqual(["a", "c"]);
    expect(variationIdsToDemoteOnApprove(variations, "a")).toEqual(["c"]);
  });

  it("clears concept approved link when demoting winner", () => {
    expect(
      shouldClearApprovedVariationId("a", "a", "rejected"),
    ).toBe(true);
    expect(
      shouldClearApprovedVariationId("a", "b", "rejected"),
    ).toBe(false);
  });
});

describe("variation storage paths", () => {
  const variationId = "550e8400-e29b-41d4-a716-446655440000";

  it("validates variation ids", () => {
    expect(isValidVariationId(variationId)).toBe(true);
    expect(isValidVariationId("../etc/passwd")).toBe(false);
  });

  it("builds safe relative keys", () => {
    expect(variationStorageBaseKey(variationId)).toBe(
      `variations/${variationId}`,
    );
    expect(variationVariantKey(variationId, "thumb")).toBe(
      `variations/${variationId}/thumb.webp`,
    );
  });
});
