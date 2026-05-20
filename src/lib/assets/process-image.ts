import sharp from "sharp";

const THUMB_MAX_EDGE = 256;
const CARD_MAX_EDGE = 800;
const FULL_MAX_EDGE = 2048;

export interface ProcessedRenditions {
  thumb: Buffer;
  card: Buffer;
  full: Buffer;
  width: number;
  height: number;
}

/**
 * Generates thumb, card, and full WebP renditions from an image buffer.
 */
export async function processImageRenditions(
  input: Buffer,
): Promise<ProcessedRenditions> {
  const image = sharp(input, { failOn: "none" });
  const metadata = await image.metadata();

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  const [thumb, card, full] = await Promise.all([
    sharp(input)
      .rotate()
      .resize(THUMB_MAX_EDGE, THUMB_MAX_EDGE, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer(),
    sharp(input)
      .rotate()
      .resize(CARD_MAX_EDGE, CARD_MAX_EDGE, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer(),
    sharp(input)
      .rotate()
      .resize(FULL_MAX_EDGE, FULL_MAX_EDGE, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 90 })
      .toBuffer(),
  ]);

  return { thumb, card, full, width, height };
}
