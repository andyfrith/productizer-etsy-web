import { z } from "zod";
import { setConceptPreviewAsset } from "@/lib/concepts/repository";
import { jsonError } from "@/lib/api/errors";

const idSchema = z.string().uuid();

const previewBodySchema = z.object({
  assetId: z.string().uuid(),
});

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PUT /api/concepts/:id/preview — set which reference asset is the preview image.
 */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const parsedId = idSchema.safeParse(id);

    if (!parsedId.success) {
      return jsonError("Invalid concept id", 400);
    }

    const body: unknown = await request.json();
    const parsedBody = previewBodySchema.safeParse(body);

    if (!parsedBody.success) {
      return jsonError("Invalid request body", 400);
    }

    const concept = await setConceptPreviewAsset(
      parsedId.data,
      parsedBody.data.assetId,
    );

    if (!concept) {
      return jsonError("Concept or asset not found", 404);
    }

    return Response.json(concept);
  } catch {
    return jsonError("Failed to set preview image", 500);
  }
}
