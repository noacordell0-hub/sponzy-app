import { expect, test } from "@playwright/test";
import { isLocal, mockWaitlist, okSignup, skipIntro } from "./helpers";

test.beforeEach(async ({ page }) => {
  await skipIntro(page);
});

const hero = (page: import("@playwright/test").Page) => ({
  email: page.locator("#email-hero"),
  submit: page.locator("form:has(#email-hero) button[type=submit]"),
  alert: page.locator("form:has(#email-hero) [role=alert]"),
});

test("empty submit shows a friendly message and sends nothing", async ({ page }) => {
  let calls = 0;
  await mockWaitlist(page, (_b, r) => { calls++; return r.fulfill({ json: okSignup }); });
  await page.goto("/");
  const f = hero(page);
  await f.submit.click();
  await expect(f.alert).toContainText("Enter your email");
  expect(calls).toBe(0);
});

test("invalid email is rejected before sending", async ({ page }) => {
  let calls = 0;
  await mockWaitlist(page, (_b, r) => { calls++; return r.fulfill({ json: okSignup }); });
  await page.goto("/");
  const f = hero(page);
  await f.email.fill("not-an-email");
  await f.submit.click();
  await expect(f.alert).toContainText("valid email");
  expect(calls).toBe(0);
});

test("valid email shows place in line and an invite link", async ({ page }) => {
  await mockWaitlist(page, (_b, r) => r.fulfill({ json: okSignup }));
  await page.goto("/");
  const f = hero(page);
  await f.email.fill("person@example.com");
  await f.submit.click();
  await expect(page.getByText("You're #412")).toBeVisible();
  await expect(page.locator("input[readonly]").first()).toHaveValue(/\?ref=test1234$/);
  await expect(page.getByText("Invite 3 friends").first()).toBeVisible();
});

test("duplicate email returns the existing spot instead of an error", async ({ page }) => {
  await mockWaitlist(page, (_b, r) => r.fulfill({ json: { ...okSignup, returning: true, position: 7, referrals: 2 } }));
  await page.goto("/");
  const f = hero(page);
  await f.email.fill("already@example.com");
  await f.submit.click();
  await expect(page.getByText("You're #7")).toBeVisible();
  await expect(page.getByText("2/3")).toBeVisible();
});

test("slow network: button shows progress and a double click sends one request", async ({ page }) => {
  let calls = 0;
  await mockWaitlist(page, async (_b, r) => { calls++; await new Promise((res) => setTimeout(res, 1500)); await r.fulfill({ json: okSignup }); });
  await page.goto("/");
  const f = hero(page);
  await f.email.fill("slow@example.com");
  await f.submit.dblclick();
  await expect(f.submit).toHaveText("Saving…");
  await expect(f.submit).toBeDisabled();
  await expect(page.getByText("You're #412")).toBeVisible();
  expect(calls).toBe(1);
});

test("server errors and rate limits show readable messages", async ({ page }) => {
  let n = 0;
  await mockWaitlist(page, (_b, r) => (n++ === 0
    ? r.fulfill({ status: 429, json: { error: "Too many tries. Please wait a minute and try again." } })
    : r.fulfill({ status: 500, json: { error: "Something went wrong. Please try again." } })));
  await page.goto("/");
  const f = hero(page);
  await f.email.fill("busy@example.com");
  await f.submit.click();
  await expect(f.alert).toContainText("Too many tries");
  await f.submit.click();
  await expect(f.alert).toContainText("Something went wrong");
});

test("network failure tells the visitor to check their connection", async ({ page }) => {
  await page.route("**/api/waitlist", (r) => (r.request().method() === "POST" ? r.abort() : r.continue()));
  await page.goto("/");
  const f = hero(page);
  await f.email.fill("offline@example.com");
  await f.submit.click();
  await expect(f.alert).toContainText("couldn't reach Clouta");
});

test.describe("server-side validation (real API)", () => {
  test.skip(!isLocal, "Never post to the live waitlist");
  test("rejects bad input without trusting the browser", async ({ request }, info) => {
    // All test devices share one IP, and the waitlist allows 5 tries a minute per IP, so run this once.
    test.skip(info.project.name !== "desktop", "runs once (rate limit is per IP)");
    const bad = await request.post("/api/waitlist", { data: { email: "nope" } });
    expect(bad.status()).toBe(400);
    const long = await request.post("/api/waitlist", { data: { email: `${"a".repeat(250)}@x.com` } });
    expect(long.status()).toBe(400);
    const junk = await request.post("/api/waitlist", { data: "not json", headers: { "Content-Type": "application/json" } });
    expect(junk.status()).toBe(400);
    // Honeypot: bots that fill the hidden field get a fake success and nothing is saved.
    const bot = await request.post("/api/waitlist", { data: { email: "bot@example.com", company: "Acme" } });
    expect(bot.status()).toBe(200);
  });
});

test.describe("rate limiting (real API)", () => {
  test.skip(!isLocal, "Never post to the live waitlist");
  test("too many tries from one visitor get a 429 with a readable message", async ({ request }, info) => {
    test.skip(info.project.name !== "android", "runs once (rate limit is per IP)");
    let last = 0;
    for (let i = 0; i < 7; i++) last = (await request.post("/api/waitlist", { data: { email: "x" }, headers: { "x-real-ip": "203.0.113.9" } })).status();
    expect(last).toBe(429);
  });
});
