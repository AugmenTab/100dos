import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "test/e2e",
  fullyParallel: false,
  // Multiple workers were tried and reverted: each would join Foundry as
  // the same "Gamemaster" user, and concurrent joins race on that user's
  // session slot on the /join screen (Foundry blocks a second concurrent
  // login as an already-connecting user), causing real timeouts/failures.
  // Fixing that requires provisioning a separate GM-privileged User per
  // worker lane in the dedicated test world — real infra work, not a
  // config change — so this stays serial for now.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["line"], ["html", { open: "never" }]],
  globalSetup: "./test/e2e/support/global-setup.ts",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://foundry-test:30000",
    storageState: "test-results/.auth/gm.json",
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
