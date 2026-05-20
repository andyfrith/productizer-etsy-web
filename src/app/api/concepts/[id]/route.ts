import { z } from "zod";
import {
  archiveConcept,
  getConceptById,
  updateConcept,
} from "@/lib/concepts/repository";
import { jsonError } from "@/lib/api/errors";
import { conceptFormSchema } from "@/lib/schemas/concept";

const idSchema = z.string().uuid();

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/concepts/:id — fetch one concept.
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

    return Response.json(concept);
  } catch {
    return jsonError("Failed to fetch concept", 500);
  }
}

/**
 * PATCH /api/concepts/:id — update concept fields.
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const parsedId = idSchema.safeParse(id);

    if (!parsedId.success) {
      return jsonError("Invalid concept id", 400);
    }

    const body: unknown = await request.json();
    const parsedBody = conceptFormSchema.partial().safeParse(body);

    if (!parsedBody.success) {
      return jsonError(
        parsedBody.error.issues[0]?.message ?? "Invalid request body",
        400,
      );
    }

    if (Object.keys(parsedBody.data).length === 0) {
      return jsonError("No fields to update", 400);
    }

    const concept = await updateConcept(parsedId.data, parsedBody.data);

    if (!concept) {
      return jsonError("Concept not found", 404);
    }

    return Response.json(concept);
  } catch {
    return jsonError("Failed to update concept", 500);
  }
}

/**
 * DELETE /api/concepts/:id — archive concept (soft delete).
 */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const parsedId = idSchema.safeParse(id);

    if (!parsedId.success) {
      return jsonError("Invalid concept id", 400);
    }

    const concept = await archiveConcept(parsedId.data);

    if (!concept) {
      return jsonError("Concept not found", 404);
    }

    return Response.json(concept);
  } catch {
    return jsonError("Failed to archive concept", 500);
  }
}
