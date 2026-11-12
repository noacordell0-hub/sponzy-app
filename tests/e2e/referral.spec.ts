import { expect, test } from "@playwright/test";
import { mockWaitlist, okSignup, skipIntro } from "./helpers";

test("invite link is sent with the signup and remembered as the source", async ({ page }) => {
  await skipIntro(page);
  let sent: Record<string, unknown> = {};
  await mockWaitlist(page, (b, r) => { sent = b; return r.fulfill({ json: okSignup }); });
  await page.goto("/?ref=abc12345");
  await page.locator("#email-hero").fill("friend@example.com");
  await page.locator("form:has(#email-hero) button[type=submit]").click();
  await expect(page.getByText("You're #412")).toBeVisible();
  expect(sent.ref).toBe("abc12345");
  expect(sent.utm_source).toBe("invite");
  expect(sent.utm_medium).toBe("referral");
});

test("invalid invite codes are ignored", async ({ page }) => {
  await skipIntro(page);
  let sent: Record<string, unknown> = {};
  await mockWaitlist(page, (b, r) => { sent = b; return r.fulfill({ json: okSignup }); });
  await page.goto("/?ref=<script>");
  await page.locator("#email-hero").fill("friend2@example.com");
  await page.locator("form:has(#email-hero) button[type=submit]").click();
  await expect(page.getByText("You're #412")).toBeVisible();
  expect(sent.ref).toBeNull();
});

test("UTM tags from the first visit are saved with the signup", async ({ page }) => {
  await skipIntro(page);
  let sent: Record<string, unknown> = {};
  await mockWaitlist(page, (b, r) => { sent = b; return r.fulfill({ json: okSignup }); });
  await page.goto("/?utm_source=tiktok&utm_medium=bio&utm_campaign=launch");
  await page.waitForFunction(() => localStorage.getItem("clouta-utm"));
  await page.goto("/"); // a later visit without tags keeps the first source
  await page.locator("#email-hero").fill("utm@example.com");
  await page.locator("form:has(#email-hero) button[type=submit]").click();
  await expect(page.getByText("You're #412")).toBeVisible();
  expect(sent).toMatchObject({ utm_source: "tiktok", utm_medium: "bio", utm_campaign: "launch" });
});
