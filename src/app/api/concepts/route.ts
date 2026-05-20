import { z } from "zod";
import {
  createConcept,
  listConcepts,
} from "@/lib/concepts/repository";
import { jsonError } from "@/lib/api/errors";
import { conceptFormSchema } from "@/lib/schemas/concept";

const listQuerySchema = z.object({
  includeArchived: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

/**
 * GET /api/concepts — list concepts (archived excluded by default).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = listQuerySchema.safeParse({
      includeArchived: searchParams.get("includeArchived") ?? undefined,
    });

    if (!parsed.success) {
      return jsonError("Invalid query parameters", 400);
    }

    const concepts = await listConcepts({
      includeArchived: parsed.data.includeArchived,
    });

    return Response.json(concepts);
  } catch {
    return jsonError("Failed to list concepts", 500);
  }
}

/**
 * POST /api/concepts — create a concept.
 */
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = conceptFormSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        parsed.error.issues[0]?.message ?? "Invalid request body",
        400,
      );
    }

    const concept = await createConcept(parsed.data);
    return Response.json(concept, { status: 201 });
  } catch {
    return jsonError("Failed to create concept", 500);
  }
}
