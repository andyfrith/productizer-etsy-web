/** Variation approval status stored in Postgres. */
export type VariationStatus = "pending" | "approved" | "rejected";

/** API / client representation of a concept variation. */
export interface VariationDto {
  id: string;
  conceptId: string;
  parentVariationId: string | null;
  sourceAssetId: string | null;
  status: VariationStatus;
  promptSnapshot: string | null;
  storageKey: string;
  thumbKey: string;
  cardKey: string;
  fullKey: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  createdAt: string;
  updatedAt: string;
  /** Convenience URL for gallery thumbs. */
  thumbUrl: string;
}
