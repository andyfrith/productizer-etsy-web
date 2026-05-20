import { z } from "zod";
import { jsonError } from "@/lib/api/errors";
import {
  conceptAcceptsVariations,
  createVariationFromAsset,
} from "@/lib/variations/repository";
import { createVariationFromAssetSchema } from "@/lib/schemas/variation";

const idSchema = z.string().uuid();

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/concepts/:id/variations/from-asset — branch variation from reference.
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

    const body: unknown = await request.json();
    const parsedBody = createVariationFromAssetSchema.safeParse(body);

    if (!parsedBody.success) {
      return jsonError(
        parsedBody.error.issues[0]?.message ?? "Invalid request body",
        400,
      );
    }

    const variation = await createVariationFromAsset({
      conceptId: parsedId.data,
      assetId: parsedBody.data.assetId,
      parentVariationId: parsedBody.data.parentVariationId,
    });

    if (!variation) {
      return jsonError(
        "Reference asset not found, archived, or invalid parent variation",
        400,
      );
    }

    return Response.json(variation, { status: 201 });
  } catch {
    return jsonError("Failed to create variation from asset", 500);
  }
}
