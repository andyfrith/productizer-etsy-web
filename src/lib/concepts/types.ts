/** Design concept lifecycle status stored in Postgres. */
export type ConceptStatus = "draft" | "active" | "archived";

/** API / client representation of a design concept. */
export interface ConceptDto {
  id: string;
  name: string;
  description: string | null;
  campaignLabel: string | null;
  styleNotes: string | null;
  status: ConceptStatus;
  previewAssetId: string | null;
  approvedVariationId: string | null;
  createdAt: string;
  updatedAt: string;
}
