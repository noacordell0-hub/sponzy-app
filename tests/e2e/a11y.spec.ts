import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { skipIntro } from "./helpers";

const PAGES = ["/", "/browse", "/login", "/signup", "/terms", "/privacy", "/leaderboard"];

test.beforeEach(async ({ page }) => {
  await skipIntro(page);
});

for (const path of PAGES) {
  test(`${path} has no serious or critical accessibility issues`, async ({ page }) => {
    await page.goto(path);
    await page.waitForTimeout(800); // let entrance animations finish so colours are final
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(bad.map((v) => `${v.id}: ${v.help} (${v.nodes.length}) e.g. ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
  });
}

test("keyboard: tab reaches the email field, sliders and FAQ with a visible focus outline", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "keyboard test runs on desktop");
  await page.goto("/");
  const seen = new Set<string>();
  const noOutline: string[] = [];
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press("Tab");
    const el = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null;
      if (!a) return null;
      const s = getComputedStyle(a);
      const visible = s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0 || s.boxShadow !== "none";
      return { id: `${a.tagName}:${a.getAttribute("type") ?? a.textContent?.trim().slice(0, 20)}#${a.id}`, visible };
    });
    if (!el || el.id.startsWith("BODY")) continue;
    if (!el.visible) noOutline.push(el.id);
    seen.add(el.id);
  }
  expect(noOutline, "elements without a visible focus outline").toEqual([]);
  expect([...seen].some((s) => s.endsWith("#email-hero"))).toBe(true);
  expect([...seen].some((s) => s.startsWith("INPUT:range"))).toBe(true);
  expect([...seen].some((s) => s.startsWith("SUMMARY"))).toBe(true);
});

test("FAQ opens with the keyboard", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "keyboard test runs on desktop");
  await page.goto("/#faq");
  const summary = page.locator("details[data-faq='launch'] summary");
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("details[data-faq='launch']")).toHaveAttribute("open", "");
});

test("touch targets on phones are at least 44px tall", async ({ page }, info) => {
  test.skip(info.project.name === "desktop", "phone sizes only");
  await page.goto("/");
  const small = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("main a, main button, main input:not([type=hidden]), main summary, header a, header button, footer a")]
      // Links inside a sentence are exempt from the size rule (WCAG 2.5.8 "inline" exception).
      .filter((el) => el.offsetParent !== null && !el.closest("[aria-hidden=true]") && !el.classList.contains("hidden") && !(el.tagName === "A" && el.closest("p")))
      .map((el) => ({ el: (el.textContent || el.getAttribute("aria-label") || el.id || el.tagName).trim().slice(0, 30), h: el.getBoundingClientRect().height }))
      .filter((x) => x.h > 0 && x.h < 44),
  );
  expect(small).toEqual([]);
});

test("every image has alt text and the page has one h1 with headings in order", async ({ page }) => {
  for (const path of PAGES) {
    await page.goto(path);
    expect(await page.locator("img:not([alt])").count(), path).toBe(0);
    expect(await page.locator("h1").count(), path).toBe(1);
    const levels = await page.locator("h1, h2, h3, h4").evaluateAll((hs) => hs.map((h) => Number(h.tagName[1])));
    for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1], `${path} heading jump`).toBeLessThanOrEqual(1);
  }
});
