import { z } from "zod";

/** Variation lifecycle statuses. */
export const VARIATION_STATUSES = ["pending", "approved", "rejected"] as const;

export type VariationStatus = (typeof VARIATION_STATUSES)[number];

export const variationStatusSchema = z.enum(VARIATION_STATUSES);

export const patchVariationStatusSchema = z.object({
  status: variationStatusSchema,
});

export const createVariationFromAssetSchema = z.object({
  assetId: z.string().uuid(),
  parentVariationId: z.string().uuid().optional(),
});

/**
 * When approving a variation, other approved rows for the same concept must be demoted.
 */
export function variationIdsToDemoteOnApprove(
  variations: { id: string; status: VariationStatus }[],
  targetId: string,
): string[] {
  return variations
    .filter((v) => v.id !== targetId && v.status === "approved")
    .map((v) => v.id);
}

/**
 * Whether approving a concept's approved_variation_id should be cleared for a status change.
 */
export function shouldClearApprovedVariationId(
  currentApprovedId: string | null,
  variationId: string,
  nextStatus: VariationStatus,
): boolean {
  if (currentApprovedId !== variationId) {
    return false;
  }

  return nextStatus === "pending" || nextStatus === "rejected";
}
