/** Input for image generation providers (P4+). */
export interface GenerateImageInput {
  prompt: string;
  width?: number;
  height?: number;
}

/** Result from a successful generation job. */
export interface GenerateImageResult {
  storageKey: string;
}

/** Pluggable image backend (Nano Banana, etc.). */
export interface ImageGenerationProvider {
  readonly id: string;
  generate(input: GenerateImageInput): Promise<GenerateImageResult>;
}
