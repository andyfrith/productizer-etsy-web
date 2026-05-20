/** API / client representation of a design asset. */
export interface AssetDto {
  id: string;
  conceptId: string | null;
  originalFilename: string;
  mimeType: string;
  storageKey: string;
  thumbKey: string;
  cardKey: string;
  fullKey: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  createdAt: string;
  /** ISO timestamp when archived; null while active. */
  archivedAt: string | null;
}
