import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests. By default they build-and-serve the app locally on port 3100.
 * To test another deployment instead: E2E_BASE_URL=https://clouta.vercel.app npx playwright test
 * (tests that need a mocked server are skipped against remote sites).
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const local = !process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  retries: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "off",
    screenshot: "only-on-failure",
    // When testing a remote site from a network that requires a proxy, send requests through it.
    ...(!local && process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {}),
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // Only Chromium is installed here, so the phone profiles use Chromium with the phone's screen and touch settings.
    { name: "iphone", use: { ...devices["iPhone 13"], browserName: "chromium" } },
    { name: "android", use: { ...devices["Pixel 7"] } },
  ],
  webServer: local
    ? { command: "npm run start -- -p 3100", url: "http://localhost:3100/terms", reuseExistingServer: true, timeout: 120_000, ignoreHTTPSErrors: true }
    : undefined,
});
