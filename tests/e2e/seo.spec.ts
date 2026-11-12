import { expect, test } from "@playwright/test";

test.describe("SEO and sharing", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "desktop", "runs once");
  });

  const pages: [string, string][] = [["/", "/"], ["/browse", "/browse"], ["/terms", "/terms"], ["/privacy", "/privacy"], ["/login", "/login"], ["/signup", "/signup"], ["/leaderboard", "/leaderboard"]];
  for (const [path, canonical] of pages) {
    test(`${path}: unique title, description, canonical and share tags`, async ({ page }) => {
      await page.goto(path);
      expect(await page.title()).toMatch(/Clouta/);
      expect(await page.locator('meta[name="description"]').getAttribute("content")).toBeTruthy();
      expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toMatch(new RegExp(`${canonical === "/" ? "clouta.vercel.app/?$" : canonical + "$"}`));
      expect(await page.locator('meta[property="og:image"]').getAttribute("content")).toContain("opengraph-image");
      expect(await page.locator('meta[name="twitter:card"]').getAttribute("content")).toBe("summary_large_image");
    });
  }

  test("titles are unique across public pages", async ({ page }) => {
    const titles = new Set<string>();
    for (const [path] of pages) {
      await page.goto(path);
      titles.add(await page.title());
    }
    expect(titles.size).toBe(pages.length);
  });

  test("robots.txt keeps private areas out and points to the sitemap", async ({ request }) => {
    const txt = await (await request.get("/robots.txt")).text();
    for (const p of ["/admin", "/api/", "/settings", "/messages", "/orders"]) expect(txt).toContain(`Disallow: ${p}`);
    expect(txt).toContain("sitemap.xml");
  });

  test("sitemap lists the public pages and no private ones", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    expect(xml).toContain("/browse</loc>");
    expect(xml).not.toMatch(/\/(admin|settings|orders|messages)/);
  });

  test("share image and icons are served", async ({ request }) => {
    for (const p of ["/opengraph-image", "/twitter-image", "/icon.svg", "/apple-icon.png", "/favicon.ico"]) expect((await request.get(p)).status(), p).toBe(200);
  });

  test("landing page has Organization, WebSite and FAQPage structured data", async ({ page }) => {
    await page.goto("/");
    const data = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "[]");
    expect(data.map((d: { "@type": string }) => d["@type"])).toEqual(["Organization", "WebSite", "FAQPage"]);
  });

  test("landing content is in the server HTML (visible to search engines without JavaScript)", async ({ request }) => {
    const html = await (await request.get("/")).text();
    for (const t of ["Sell brand deals from", "How it works", "Is it free to join?"]) expect(html).toContain(t);
  });
});
