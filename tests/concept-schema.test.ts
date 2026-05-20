import { describe, expect, it } from "vitest";
import { conceptFormSchema } from "@/lib/schemas/concept";

describe("conceptFormSchema", () => {
  it("accepts a minimal valid concept", () => {
    const result = conceptFormSchema.safeParse({
      name: "Sunset mugs",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = conceptFormSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
});
