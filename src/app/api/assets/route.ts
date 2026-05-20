import { z } from "zod";
import { createAssetFromUpload } from "@/lib/assets/repository";
import { jsonError } from "@/lib/api/errors";
import { getConceptById } from "@/lib/concepts/repository";
import {
  isAllowedAssetMimeType,
  MAX_ASSET_BYTES,
} from "@/lib/schemas/asset";

const conceptIdSchema = z.string().uuid();

/**
 * POST /api/assets — upload reference image (multipart).
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const conceptIdRaw = formData.get("conceptId");

    if (!(file instanceof File)) {
      return jsonError("Missing file field", 400);
    }

    if (!isAllowedAssetMimeType(file.type)) {
      return jsonError(
        "Invalid file type. Allowed: PNG, JPEG, WebP",
        400,
      );
    }

    if (file.size > MAX_ASSET_BYTES) {
      return jsonError("File exceeds maximum size (10 MB)", 400);
    }

    let conceptId: string | undefined;

    if (conceptIdRaw !== null && conceptIdRaw !== "") {
      const parsed = conceptIdSchema.safeParse(String(conceptIdRaw));

      if (!parsed.success) {
        return jsonError("Invalid conceptId", 400);
      }

      const concept = await getConceptById(parsed.data);

      if (!concept) {
        return jsonError("Concept not found", 404);
      }

      conceptId = parsed.data;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const asset = await createAssetFromUpload({
      buffer,
      originalFilename: file.name || "upload",
      mimeType: file.type,
      conceptId,
    });

    return Response.json(asset, { status: 201 });
  } catch {
    return jsonError("Failed to upload asset", 500);
  }
}
