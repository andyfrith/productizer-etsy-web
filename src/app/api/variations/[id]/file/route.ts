import fs from "node:fs/promises";
import { z } from "zod";
import { jsonError } from "@/lib/api/errors";
import {
  getVariationById,
  getVariationVariantAbsolutePath,
} from "@/lib/variations/repository";
import { parseAssetVariant } from "@/lib/schemas/asset";

const idSchema = z.string().uuid();

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/variations/:id/file?variant=thumb|card|full — stream rendition bytes.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const parsedId = idSchema.safeParse(id);

    if (!parsedId.success) {
      return jsonError("Invalid variation id", 400);
    }

    const { searchParams } = new URL(request.url);
    const variant = parseAssetVariant(searchParams.get("variant"));

    if (!variant) {
      return jsonError("Invalid or missing variant query", 400);
    }

    const variation = await getVariationById(parsedId.data);

    if (!variation) {
      return jsonError("Variation not found", 404);
    }

    const filePath = getVariationVariantAbsolutePath(variation, variant);

    try {
      const bytes = await fs.readFile(filePath);

      return new Response(bytes, {
        status: 200,
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "private, max-age=3600",
        },
      });
    } catch {
      return jsonError("Variation file not found", 404);
    }
  } catch {
    return jsonError("Failed to serve variation file", 500);
  }
}
