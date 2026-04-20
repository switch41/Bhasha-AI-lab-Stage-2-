import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("should show 404 page for unknown routes", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
    await expect(page.getByText("Page Not Found")).toBeVisible();
  });

  test("should navigate to content page from landing", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    await page.getByRole("button", { name: /browse content/i }).click({ force: true });
    await expect(page).toHaveURL(/\/content/);
  });
});
