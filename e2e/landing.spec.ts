import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for page and framer-motion animations to settle
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
  });

  test("should render hero section with title", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /preserve.*empower/i })
    ).toBeVisible();
  });

  test("should show header and hero CTA buttons", async ({ page }) => {
    const headerBtn = page.getByRole("button", { name: /get started|dashboard/i }).first();
    await expect(headerBtn).toBeVisible({ timeout: 10000 });
  });

  test("should show feature cards", async ({ page }) => {
    await expect(page.getByText("Content Contribution")).toBeVisible();
    await expect(page.getByText("Dataset Creation")).toBeVisible();
    await expect(page.getByText("AI Fine-tuning")).toBeVisible();
  });

  test("should show stats section", async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.waitForTimeout(1500);

    await expect(page.getByText("10+")).toBeVisible();
    await expect(page.getByText("1000+")).toBeVisible();
  });

  test("should show footer with copyright", async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    await expect(page.getByText(/© 2026 Bhasha AI Lab/)).toBeVisible();
  });
});
