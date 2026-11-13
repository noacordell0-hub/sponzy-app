import { expect, test } from "@playwright/test";
import { skipIntro } from "./helpers";

async function setRange(page: import("@playwright/test").Page, index: number, value: number) {
  await page.locator("input[type=range]").nth(index).evaluate((el, v) => {
    const input = el as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, String(v));
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
}
const result = (page: import("@playwright/test").Page) => page.locator("[aria-live=polite]").filter({ hasText: "You could earn" });

test.beforeEach(async ({ page }) => {
  await skipIntro(page);
  await page.goto("/");
});

test("default is $120 × 2 a month = $2,880 a year", async ({ page }) => {
  await expect(result(page)).toContainText("$2,880");
});

test("shows what a Founding Creator keeps after the 5% fee, and the standard 10%", async ({ page }) => {
  await expect(result(page)).toContainText("$2,736"); // 2,880 × 0.95
  await expect(result(page)).toContainText("$2,592"); // 2,880 × 0.90
});

test("minimum and maximum slider values", async ({ page }) => {
  await setRange(page, 0, 25);
  await setRange(page, 1, 1);
  await expect(result(page)).toContainText("$300");
  await setRange(page, 0, 1000);
  await setRange(page, 1, 12);
  await expect(result(page)).toContainText("$144,000");
});

test("keyboard moves the slider", async ({ page }) => {
  const price = page.locator("input[type=range]").first();
  await price.focus();
  await page.keyboard.press("ArrowRight"); // +$5
  await expect(result(page)).toContainText("$3,000");
});
