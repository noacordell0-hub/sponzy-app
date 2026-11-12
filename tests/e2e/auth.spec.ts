import { expect, test } from "@playwright/test";
import { skipIntro } from "./helpers";

test("wrong password shows a friendly error", async ({ page }) => {
  await skipIntro(page);
  await page.route("**/api/auth/password", (r) => r.fulfill({ status: 401, json: { error: "That email and password don't match." } }));
  await page.goto("/login");
  await page.fill("#pw-email", "someone@example.com");
  await page.fill("#pw-password", "wrong-password-1");
  await page.click("button:has-text('Log in')");
  await expect(page.locator("form [role=alert], main [role=alert]").first()).toContainText("don't match");
});

test("private pages send visitors to log in", async ({ page }) => {
  await page.goto("/earnings");
  await expect(page).toHaveURL(/\/login/);
});

test("payout and checkout APIs refuse visitors politely", async ({ request }) => {
  for (const path of ["/api/stripe/onboard", "/api/checkout", "/api/stripe/dashboard"]) {
    const res = await request.post(path, { data: {} });
    expect(res.status(), path).toBe(401);
    expect((await res.json()).error, path).toMatch(/log in/i);
  }
});

test("health check answers", async ({ request }) => {
  const res = await request.get("/api/health");
  expect([200, 503]).toContain(res.status());
  expect(await res.json()).toHaveProperty("db");
});

test("security headers are sent", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["x-powered-by"]).toBeUndefined();
});
