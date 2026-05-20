import fs from "node:fs/promises";
import { z } from "zod";
import {
  getAssetById,
  getAssetVariantAbsolutePath,
} from "@/lib/assets/repository";
import { jsonError } from "@/lib/api/errors";
import { parseAssetVariant } from "@/lib/schemas/asset";

const idSchema = z.string().uuid();

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/assets/:id/file?variant=thumb|card|full — stream rendition bytes.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const parsedId = idSchema.safeParse(id);

    if (!parsedId.success) {
      return jsonError("Invalid asset id", 400);
    }

    const { searchParams } = new URL(request.url);
    const variant = parseAssetVariant(searchParams.get("variant"));

    if (!variant) {
      return jsonError("Invalid or missing variant query", 400);
    }

    const asset = await getAssetById(parsedId.data);

    if (!asset) {
      return jsonError("Asset not found", 404);
    }

    const filePath = getAssetVariantAbsolutePath(asset, variant);

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
      return jsonError("Asset file not found", 404);
    }
  } catch {
    return jsonError("Failed to serve asset file", 500);
  }
}
