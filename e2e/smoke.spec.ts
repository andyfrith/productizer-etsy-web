import { test, expect } from "@playwright/test";

test.describe("studio home smoke", () => {
  test("loads Productizer shell with DB status and skeleton demo", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/Productizer/i);
    await expect(
      page.getByRole("heading", { name: "Productizer", level: 1 }),
    ).toBeVisible();

    await expect(page.getByTestId("db-status")).toBeVisible();
    await expect(page.getByTestId("skeleton-demo")).toBeVisible();
    await expect(page.getByText("Phase P1")).toBeVisible();
  });
});
