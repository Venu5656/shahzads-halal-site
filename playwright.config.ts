import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  /* One worker, locally as well as in CI.
   *
   * These tests share one Postgres, and some of them reach for global state:
   * checkout.spec pauses ordering for the whole shop, and both it and
   * menu.spec mark items sold out. Run in parallel, a file that pauses the
   * kitchen makes an unrelated file in another worker fail, and the failure
   * lands on a different test each run — which reads as flakiness and is
   * really interference.
   *
   * The cost is runtime. The alternative is a suite nobody trusts. */
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
