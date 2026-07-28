import { chromium, type FullConfig } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { AUTH_STATE_PATH } from "./constants.js";
import { captureDiagnostics, ensureGameView } from "./foundry-session.js";

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL =
    config.projects[0]?.use?.baseURL ?? "http://foundry-test:30000";
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });

  try {
    await page.goto(baseURL, { waitUntil: "networkidle" });
    await ensureGameView(page);

    await mkdir(path.dirname(AUTH_STATE_PATH), { recursive: true });
    await page.context().storageState({ path: AUTH_STATE_PATH });
  } catch (err) {
    const diagnostics = await captureDiagnostics(page, "global-setup-failure");
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`${message}\n${diagnostics}`);
  } finally {
    await browser.close();
  }
}
