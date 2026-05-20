import { test, expect } from "@playwright/test";

const uniqueName = () => `E2E Concept ${Date.now()}`;

test.describe("concept CRUD", () => {
  test("create, edit, and archive a concept", async ({ page }) => {
    const name = uniqueName();
    const updatedName = `${name} Updated`;

    await page.goto("/concepts");
    await page.getByRole("link", { name: "New concept" }).click();
    await expect(page.getByTestId("concept-form")).toBeVisible();

    await page.getByTestId("concept-name-input").fill(name);
    await page.getByTestId("concept-save").click();

    await expect(page).toHaveURL(/\/concepts\/[0-9a-f-]{36}$/i);
    await expect(page.getByText(name, { exact: true })).toBeVisible();

    await page.goto("/concepts");
    await expect(page.getByText(name)).toBeVisible();

    await page.getByRole("link", { name: new RegExp(name) }).click();
    await page.getByTestId("concept-name-input").fill(updatedName);
    await page.getByTestId("concept-save").click();
    await expect(page.getByText(updatedName, { exact: true })).toBeVisible();

    await page.getByTestId("concept-archive").click();
    await page.getByRole("button", { name: "Archive" }).click();

    await expect(page).toHaveURL("/concepts");
    await expect(page.getByText(updatedName)).not.toBeVisible();
  });

  test("studio home links to concepts with P1 badge", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Phase P1")).toBeVisible();
    await page.getByRole("link", { name: "Concept gallery" }).click();
    await expect(page).toHaveURL("/concepts");
    await expect(page.getByRole("heading", { name: "Concepts" })).toBeVisible();
  });
});
