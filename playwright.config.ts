import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "test/e2e",
  fullyParallel: true,
  // Each worker joins Foundry as its own dedicated [E2E] Gamemaster N user
  // (support/e2e-users.ts, support/session.ts) instead of sharing one
  // authenticated session, so concurrent workers no longer collide on a
  // single user's /join session slot. Earlier benchmarks found 4+ workers
  // slower than 3, but the shared resource was CPU spent on each client's
  // software-rendered game canvas, which support/session.ts now disables.
  // With it off the suite runs in ~40s at 3 workers, so there's been no
  // need to re-benchmark higher counts.
  workers: 3,
  retries: process.env.CI ? 1 : 0,
  reporter: [["line"], ["html", { open: "never" }]],
  globalSetup: "./test/e2e/support/global-setup.ts",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://foundry-test:30000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
