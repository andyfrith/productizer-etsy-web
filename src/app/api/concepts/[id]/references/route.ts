import { z } from "zod";
import { listAssetsByConceptId } from "@/lib/assets/repository";
import { getConceptById } from "@/lib/concepts/repository";
import { jsonError } from "@/lib/api/errors";

const idSchema = z.string().uuid();

const listQuerySchema = z.object({
  archived: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/concepts/:id/references — list active or archived reference images.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const parsedId = idSchema.safeParse(id);

    if (!parsedId.success) {
      return jsonError("Invalid concept id", 400);
    }

    const { searchParams } = new URL(request.url);
    const parsedQuery = listQuerySchema.safeParse({
      archived: searchParams.get("archived") ?? undefined,
    });

    if (!parsedQuery.success) {
      return jsonError("Invalid query parameters", 400);
    }

    const concept = await getConceptById(parsedId.data);

    if (!concept) {
      return jsonError("Concept not found", 404);
    }

    const assets = await listAssetsByConceptId(parsedId.data, {
      archived: parsedQuery.data.archived,
    });

    return Response.json(assets);
  } catch {
    return jsonError("Failed to list reference images", 500);
  }
}
