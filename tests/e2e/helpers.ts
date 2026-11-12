import type { Page, Route } from "@playwright/test";

export const isLocal = !process.env.E2E_BASE_URL;

/** Skip the 2-second intro animation in tests. */
export async function skipIntro(page: Page) {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("clouta-intro", "1");
    } catch {}
  });
}

/** Pretend to be the waitlist API so UI tests never create real signups. */
export async function mockWaitlist(page: Page, handler: (body: Record<string, unknown>, route: Route) => Promise<void> | void) {
  await page.route("**/api/waitlist", async (route) => {
    if (route.request().method() !== "POST") return route.fulfill({ status: 404, body: "{}" });
    const body = JSON.parse(route.request().postData() ?? "{}");
    await handler(body, route);
  });
}

export const okSignup = { ok: true, code: "test1234", position: 412, referrals: 0, total: 900 };
