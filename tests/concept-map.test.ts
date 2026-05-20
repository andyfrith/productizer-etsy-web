import { describe, expect, it } from "vitest";
import { mapConceptRow } from "@/lib/concepts/repository";

describe("mapConceptRow", () => {
  it("maps database row to API DTO", () => {
    const created = new Date("2026-05-19T12:00:00.000Z");
    const updated = new Date("2026-05-19T13:00:00.000Z");

    const dto = mapConceptRow({
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Sunset mugs",
      description: "Warm palette",
      campaignLabel: "cottagecore",
      styleNotes: null,
      status: "draft",
      createdAt: created,
      updatedAt: updated,
    });

    expect(dto).toEqual({
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Sunset mugs",
      description: "Warm palette",
      campaignLabel: "cottagecore",
      styleNotes: null,
      status: "draft",
      createdAt: created.toISOString(),
      updatedAt: updated.toISOString(),
    });
  });
});
