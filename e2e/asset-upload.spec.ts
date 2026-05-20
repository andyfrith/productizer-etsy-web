import path from "node:path";
import { test, expect } from "@playwright/test";

const uniqueName = () => `E2E Upload ${Date.now()}`;
const fixturePath = path.join(__dirname, "fixtures", "sample.png");

async function clickUndoToast(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Undo" }).click();
}

async function createConceptOnDetail(page: import("@playwright/test").Page) {
  const name = uniqueName();
  await page.goto("/concepts/new");
  await page.getByTestId("concept-name-input").fill(name);
  await page.getByTestId("concept-save").click();
  await expect(page).toHaveURL(/\/concepts\/[0-9a-f-]{36}$/i);
  return name;
}

async function uploadOneReference(page: import("@playwright/test").Page) {
  await page.locator("#asset-file-input").setInputFiles(fixturePath);
  await page.getByRole("button", { name: "Upload reference" }).click();
  await expect(page.getByTestId("asset-preview")).toBeVisible({
    timeout: 15_000,
  });
}

test.describe("asset upload", () => {
  test("upload reference image on concept detail", async ({ page }) => {
    await createConceptOnDetail(page);

    await expect(page.getByTestId("asset-upload")).toBeVisible();

    await page.locator("#asset-file-input").setInputFiles(fixturePath);
    await expect(page.getByTestId("asset-preview-local")).toBeVisible();
    await expect(
      page.locator('[data-reference-kind="pending"]'),
    ).toBeVisible();

    await page.getByRole("button", { name: "Upload reference" }).click();

    await expect(page.getByTestId("asset-preview")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("multiple references and set preview", async ({ page }) => {
    await createConceptOnDetail(page);

    await uploadOneReference(page);

    await page.locator("#asset-file-input").setInputFiles(fixturePath);
    await expect(
      page.getByRole("button", { name: "Upload reference" }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Upload reference" }).click();
    await expect(page.getByTestId("reference-gallery")).toBeVisible();
    await expect(page.getByTestId("asset-reference-card")).toHaveCount(1, {
      timeout: 15_000,
    });

    await page.getByRole("button", { name: "Set as preview" }).click();
    await expect(page.getByTestId("asset-preview")).toBeVisible();
  });

  test("remove pending selection and undo", async ({ page }) => {
    await createConceptOnDetail(page);

    await page.locator("#asset-file-input").setInputFiles(fixturePath);
    await expect(page.getByTestId("asset-preview-local")).toBeVisible();

    await page.getByTestId("asset-preview-local-remove").click();
    await expect(page.getByTestId("asset-preview-local")).not.toBeVisible();

    await clickUndoToast(page);
    await expect(page.getByTestId("asset-preview-local")).toBeVisible();
  });

  test("archive active reference and undo", async ({ page }) => {
    await createConceptOnDetail(page);
    await uploadOneReference(page);

    await page.getByTestId("asset-preview-archive").click();
    await expect(page.getByTestId("asset-preview")).not.toBeVisible({
      timeout: 5_000,
    });

    await clickUndoToast(page);
    await expect(page.getByTestId("asset-preview")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("permanently delete archived reference with confirmation", async ({
    page,
  }) => {
    await createConceptOnDetail(page);
    await uploadOneReference(page);

    await page.getByTestId("asset-preview-archive").click();
    await expect(page.getByTestId("asset-preview")).not.toBeVisible({
      timeout: 5_000,
    });

    await page.getByTestId("reference-view-archived").click();
    await expect(page.getByTestId("asset-archived-card")).toBeVisible();

    await page.getByTestId("asset-archived-card").click();
    await page.getByTestId("asset-permanent-delete").click();
    await expect(
      page.getByRole("heading", { name: "Delete reference permanently?" }),
    ).toBeVisible();

    await page.getByTestId("asset-permanent-delete-confirm").click();

    await expect(page.getByTestId("asset-archived-card")).not.toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("reference-empty-hint")).toContainText(
      "No archived",
    );
  });
});
