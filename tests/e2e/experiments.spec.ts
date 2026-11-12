import { expect, test } from "@playwright/test";
import { skipIntro } from "./helpers";

test.beforeEach(async ({ page }) => {
  await skipIntro(page);
});

test("tests are off by default: everyone sees the control", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("text=Private beta · 1,000 Founding Creator spots")).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 2000));
  await expect(page.locator("[data-track-location=sticky_mobile]")).toHaveCount(0);
});

test("sticky mobile CTA preview appears after scrolling past the form on phones", async ({ page }, info) => {
  test.skip(info.project.name === "desktop", "phones only");
  await page.goto("/?exp_preview=sticky_mobile_cta:b");
  await page.evaluate(() => window.scrollTo(0, 2500));
  await expect(page.locator("[data-track-location=sticky_mobile]")).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator("[data-track-location=sticky_mobile]")).toHaveCount(0);
});

test("live spots counter preview shows the real number from the server", async ({ page }) => {
  await page.route("**/api/waitlist/stats", (r) => r.fulfill({ json: { total: 1000, left: 997 } }));
  await page.goto("/?exp_preview=live_spots_counter:b");
  await expect(page.locator("text=997 Founding Creator spots left")).toBeVisible();
});

test("hero storefront is labelled as an example", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[aria-label='Example creator storefront'] >> text=Example").first()).toBeVisible();
});
