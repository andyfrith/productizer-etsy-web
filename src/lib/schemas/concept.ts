import { z } from "zod";

/** Shared concept form schema for RHF + Server Actions (P1). */
export const conceptFormSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  campaignLabel: z.string().max(80).optional(),
  styleNotes: z.string().max(1000).optional(),
});

export type ConceptFormValues = z.infer<typeof conceptFormSchema>;
