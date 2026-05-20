import { z } from "zod";
import {
  archiveAssetForConcept,
  getAssetById,
  permanentlyDeleteAssetForConcept,
  restoreAssetForConcept,
} from "@/lib/assets/repository";
import { getConceptById } from "@/lib/concepts/repository";
import { jsonError } from "@/lib/api/errors";

const idSchema = z.string().uuid();
const conceptIdQuerySchema = z.string().uuid();

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/assets/:id — asset metadata.
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const parsedId = idSchema.safeParse(id);

    if (!parsedId.success) {
      return jsonError("Invalid asset id", 400);
    }

    const asset = await getAssetById(parsedId.data);

    if (!asset) {
      return jsonError("Asset not found", 404);
    }

    return Response.json(asset);
  } catch {
    return jsonError("Failed to fetch asset", 500);
  }
}

/**
 * DELETE /api/assets/:id?conceptId= — archive an active reference.
 * DELETE /api/assets/:id?conceptId=&permanent=true — permanently delete an archived reference.
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const parsedId = idSchema.safeParse(id);

    if (!parsedId.success) {
      return jsonError("Invalid asset id", 400);
    }

    const { searchParams } = new URL(request.url);
    const parsedConceptId = conceptIdQuerySchema.safeParse(
      searchParams.get("conceptId"),
    );

    if (!parsedConceptId.success) {
      return jsonError("Invalid or missing conceptId query", 400);
    }

    const permanent = searchParams.get("permanent") === "true";

    const ok = permanent
      ? await permanentlyDeleteAssetForConcept(
          parsedId.data,
          parsedConceptId.data,
        )
      : await archiveAssetForConcept(parsedId.data, parsedConceptId.data);

    if (!ok) {
      return jsonError(
        permanent
          ? "Archived asset not found for this concept"
          : "Active asset not found for this concept",
        404,
      );
    }

    const concept = await getConceptById(parsedConceptId.data);

    if (!concept) {
      return jsonError("Concept not found", 404);
    }

    return Response.json(concept);
  } catch {
    return jsonError("Failed to update reference image", 500);
  }
}

/**
 * POST /api/assets/:id/restore?conceptId= — restore an archived reference (undo archive).
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const parsedId = idSchema.safeParse(id);

    if (!parsedId.success) {
      return jsonError("Invalid asset id", 400);
    }

    const { searchParams } = new URL(request.url);
    const parsedConceptId = conceptIdQuerySchema.safeParse(
      searchParams.get("conceptId"),
    );

    if (!parsedConceptId.success) {
      return jsonError("Invalid or missing conceptId query", 400);
    }

    const restored = await restoreAssetForConcept(
      parsedId.data,
      parsedConceptId.data,
    );

    if (!restored) {
      return jsonError("Archived asset not found for this concept", 404);
    }

    const concept = await getConceptById(parsedConceptId.data);

    if (!concept) {
      return jsonError("Concept not found", 404);
    }

    return Response.json(concept);
  } catch {
    return jsonError("Failed to restore reference image", 500);
  }
}
