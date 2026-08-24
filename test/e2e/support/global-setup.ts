import { chromium, type FullConfig } from "@playwright/test";
import { GM_USER_LABEL } from "./constants.js";
import { ensureE2eGmUsers } from "./e2e-users.js";
import { captureDiagnostics, ensureGameView } from "./foundry-session.js";

/**
 * Runs once, before any Playwright worker starts. Joins as the world's
 * original "Gamemaster" user only to provision the dedicated per-lane E2E
 * GM users (see e2e-users.ts) — each worker then joins as its own User
 * (support/session.ts), so no authenticated state is captured/shared here.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL =
    config.projects[0]?.use?.baseURL ?? "http://foundry-test:30000";
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });

  try {
    await page.goto(baseURL, { waitUntil: "networkidle" });
    await ensureGameView(page, GM_USER_LABEL);
    await ensureE2eGmUsers(page);
  } catch (err) {
    const diagnostics = await captureDiagnostics(page, "global-setup-failure");
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`${message}\n${diagnostics}`);
  } finally {
    await browser.close();
  }
}
