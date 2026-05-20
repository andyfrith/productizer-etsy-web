import { z } from "zod";
import { jsonError } from "@/lib/api/errors";
import { getConceptById } from "@/lib/concepts/repository";
import {
  conceptAcceptsVariations,
  createVariationFromUpload,
  listVariationsByConceptId,
} from "@/lib/variations/repository";
import {
  isAllowedAssetMimeType,
  MAX_ASSET_BYTES,
} from "@/lib/schemas/asset";

const idSchema = z.string().uuid();
const parentVariationIdSchema = z.string().uuid().optional();

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/concepts/:id/variations — list variations for a concept.
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const parsedId = idSchema.safeParse(id);

    if (!parsedId.success) {
      return jsonError("Invalid concept id", 400);
    }

    const concept = await getConceptById(parsedId.data);

    if (!concept) {
      return jsonError("Concept not found", 404);
    }

    const variations = await listVariationsByConceptId(parsedId.data);
    return Response.json(variations);
  } catch {
    return jsonError("Failed to list variations", 500);
  }
}

/**
 * POST /api/concepts/:id/variations — upload a new variation (multipart).
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const parsedId = idSchema.safeParse(id);

    if (!parsedId.success) {
      return jsonError("Invalid concept id", 400);
    }

    if (!(await conceptAcceptsVariations(parsedId.data))) {
      return jsonError("Concept not found", 404);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const parentRaw = formData.get("parentVariationId");

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

    let parentVariationId: string | undefined;

    if (parentRaw !== null && parentRaw !== "") {
      const parsedParent = parentVariationIdSchema.safeParse(String(parentRaw));

      if (!parsedParent.success) {
        return jsonError("Invalid parentVariationId", 400);
      }

      parentVariationId = parsedParent.data;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const variation = await createVariationFromUpload({
      conceptId: parsedId.data,
      buffer,
      byteSize: file.size,
      parentVariationId,
    });

    if (!variation) {
      return jsonError("Invalid parent variation", 400);
    }

    return Response.json(variation, { status: 201 });
  } catch {
    return jsonError("Failed to create variation", 500);
  }
}
