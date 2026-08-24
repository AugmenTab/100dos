import { defineConfig } from "@playwright/test";

// The lightweight tier has none of the real-Foundry tier's shared-session
// constraints (no world/GM-user/socket to collide on) — each test is just
// a static page render, so ordinary Playwright parallelism applies with no
// special worker-count tuning. Defaults to Playwright's own CPU-based
// worker count rather than hardcoding one.
export default defineConfig({
  testDir: "test/browser",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["line"], ["html", { open: "never", outputFolder: "browser-test-report" }]],
  // Playwright clears its outputDir at the start of every run — scripts/
  // ui-test runs this config concurrently with playwright.config.ts's own
  // Foundry-tier run, and both default to test-results/. Left shared, one
  // run wipes the other's in-progress artifacts (this is exactly how the
  // first combined-gate run silently lost its browser-tier log).
  outputDir: "test-results-browser",
  timeout: 30_000,
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
