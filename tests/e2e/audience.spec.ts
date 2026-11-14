import { expect, test } from "@playwright/test";
import { skipIntro } from "./helpers";

test.beforeEach(async ({ page }) => {
  await skipIntro(page);
});

test("hero switches between the creator and brand pitch", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Sell brand deals");
  await page.getByRole("tab", { name: "For brands" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Book creators");
  await expect(page).toHaveURL(/for=brands/);
  // The signup form follows the switch.
  await expect(page.locator("#join").getByRole("button", { name: "Get early access" })).toBeVisible();
  await page.getByRole("tab", { name: "For creators" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Sell brand deals");
});

test("/?for=brands opens the brand version (for brand-facing links and ads)", async ({ page }) => {
  await page.goto("/?for=brands");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Book creators");
  await expect(page.getByRole("tab", { name: "For brands" })).toHaveAttribute("aria-selected", "true");
});

test("comparison table and brand section are on the page", async ({ page }) => {
  await page.goto("/#brands");
  await expect(page.locator("#brands")).toBeInViewport();
  await expect(page.getByRole("table", { name: /compared/i })).toBeAttached();
});
