import { z } from "zod";
import { jsonError } from "@/lib/api/errors";
import { updateVariationStatus } from "@/lib/variations/repository";
import { patchVariationStatusSchema } from "@/lib/schemas/variation";

const idSchema = z.string().uuid();

type RouteContext = {
  params: Promise<{ id: string; variationId: string }>;
};

/**
 * PATCH /api/concepts/:id/variations/:variationId — update variation status.
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id, variationId } = await context.params;
    const parsedConceptId = idSchema.safeParse(id);
    const parsedVariationId = idSchema.safeParse(variationId);

    if (!parsedConceptId.success || !parsedVariationId.success) {
      return jsonError("Invalid id", 400);
    }

    const body: unknown = await request.json();
    const parsedBody = patchVariationStatusSchema.safeParse(body);

    if (!parsedBody.success) {
      return jsonError(
        parsedBody.error.issues[0]?.message ?? "Invalid request body",
        400,
      );
    }

    const variation = await updateVariationStatus(
      parsedConceptId.data,
      parsedVariationId.data,
      parsedBody.data.status,
    );

    if (!variation) {
      return jsonError("Variation not found", 404);
    }

    return Response.json(variation);
  } catch {
    return jsonError("Failed to update variation", 500);
  }
}
