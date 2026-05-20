import type { ImageGenerationProvider } from "./types";

const stubProvider: ImageGenerationProvider = {
  id: "stub",
  async generate() {
    throw new Error("Image generation is not configured (P0 stub)");
  },
};

/**
 * Resolves the configured image provider. P0 returns a no-op stub.
 */
export function getImageProvider(providerId?: string): ImageGenerationProvider {
  void providerId;
  return stubProvider;
}
