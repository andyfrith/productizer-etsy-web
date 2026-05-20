import path from "node:path";
import { test, expect } from "@playwright/test";

const fixturePath = path.join(__dirname, "fixtures", "sample.png");

async function createConceptOnDetail(page: import("@playwright/test").Page) {
  const name = `E2E Variation ${Date.now()}`;
  await page.goto("/concepts/new");
  await page.getByTestId("concept-name-input").fill(name);
  await page.getByTestId("concept-save").click();
  await expect(page).toHaveURL(/\/concepts\/[0-9a-f-]{36}$/i);
}

async function uploadVariation(page: import("@playwright/test").Page) {
  await page.getByTestId("variation-upload").setInputFiles(fixturePath);
  await expect(
    page.locator('[data-variation-status="pending"]').first(),
  ).toBeVisible({ timeout: 15_000 });
}

test.describe("variation lineage", () => {
  test("approve one variation and demote previous on second approve", async ({
    page,
  }) => {
    await createConceptOnDetail(page);
    await expect(page.getByTestId("variation-gallery")).toBeVisible();

    await uploadVariation(page);
    await uploadVariation(page);

    const pendingCards = page.locator('[data-variation-status="pending"]');
    await expect(pendingCards).toHaveCount(2, { timeout: 15_000 });

    const firstApprove = pendingCards.first().getByTestId("variation-approve");
    await firstApprove.click();

    await expect(
      page.locator('[data-variation-status="approved"]'),
    ).toHaveCount(1, { timeout: 10_000 });

    const secondApprove = pendingCards
      .first()
      .getByTestId("variation-approve");
    await secondApprove.click();

    await expect(
      page.locator('[data-variation-status="approved"]'),
    ).toHaveCount(1, { timeout: 10_000 });
    await expect(
      page.locator('[data-variation-status="pending"]'),
    ).toHaveCount(1, { timeout: 10_000 });
  });
});
