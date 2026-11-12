import { expect, test } from "@playwright/test";
import { skipIntro } from "./helpers";

test.beforeEach(async ({ page }) => {
  await skipIntro(page);
});

for (const id of ["how", "trust", "faq", "join"]) {
  test(`#${id} section exists and is reachable`, async ({ page }) => {
    await page.goto(`/#${id}`);
    await expect(page.locator(`#${id}`)).toBeInViewport();
  });
}

test("FAQ items open and close", async ({ page }) => {
  await page.goto("/#faq");
  const item = page.locator("details[data-faq='free']");
  await item.locator("summary").click();
  await expect(item).toHaveAttribute("open", "");
  await item.locator("summary").click();
  await expect(item).not.toHaveAttribute("open", "");
});

for (const path of ["/", "/terms", "/privacy", "/browse", "/login", "/signup", "/leaderboard"]) {
  test(`${path} loads with a heading`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
  });
}

test("no broken links on the landing page", async ({ page, request }) => {
  await page.goto("/");
  const hrefs = await page.locator("a[href^='/']").evaluateAll((as) => [...new Set(as.map((a) => (a as HTMLAnchorElement).getAttribute("href")!))]);
  for (const href of hrefs) {
    const res = await request.get(href.split("#")[0] || "/");
    expect(res.status(), href).toBeLessThan(400);
  }
});

test("unknown pages show the not-found page", async ({ page }) => {
  await page.goto("/this-page-does-not-exist");
  await expect(page.getByText(/not found|could not be found/i).first()).toBeVisible();
});
