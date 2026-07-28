import { type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import {
  GM_USER_LABEL,
  SYSTEM_ID,
  WORLD_ID,
  WORLD_TITLE,
} from "./constants.js";

export type PageState =
  | "license"
  | "setup-no-world"
  | "setup-world-not-launched"
  | "join"
  | "game"
  | "unknown";

export async function detectState(page: Page): Promise<PageState> {
  const pathname = new URL(page.url()).pathname;
  if (pathname === "/license") return "license";
  if (pathname === "/join") return "join";
  if (pathname === "/game") return "game";
  if (pathname === "/setup") {
    const worldCard = page.locator(`li[data-package-id="${WORLD_ID}"]`);
    return (await worldCard.count()) > 0
      ? "setup-world-not-launched"
      : "setup-no-world";
  }
  return "unknown";
}

export async function captureDiagnostics(
  page: Page,
  label: string,
): Promise<string> {
  await mkdir("test-results/diagnostics", { recursive: true });
  const screenshotPath = `test-results/diagnostics/${label}-${Date.now()}.png`;
  await page
    .screenshot({ path: screenshotPath, fullPage: true })
    .catch(() => {});
  const heading = await page
    .locator("h1, h2")
    .first()
    .textContent()
    .catch(() => null);
  return `url=${page.url()} heading=${heading ?? "n/a"} screenshot=${screenshotPath}`;
}

/**
 * A one-time "Allow Sharing Usage Data" dialog can appear over the setup
 * screen on a fresh install and blocks clicks on the world list underneath.
 * Declining is fine for a disposable, dedicated test instance.
 */
async function dismissTelemetryPromptIfPresent(page: Page): Promise<void> {
  const dialog = page.locator("dialog.application.dialog", {
    hasText: "Allow Sharing Usage Data",
  });
  if ((await dialog.count()) === 0) return;
  await dialog.locator('button[data-action="no"]').click();
  await dialog.waitFor({ state: "detached" }).catch(() => {});
}

/**
 * Foundry can auto-start a guided feature tour (e.g. "Backups Overview") on
 * a fresh install, rendering a full-page overlay that blocks clicks on the
 * page underneath until exited.
 */
async function dismissTourIfPresent(page: Page): Promise<void> {
  const step = page.locator(".tour-center-step");
  if ((await step.count()) === 0) return;
  await step.locator('[data-action="exit"]').click();
  await step.waitFor({ state: "detached" }).catch(() => {});
}

async function dismissOverlaysIfPresent(page: Page): Promise<void> {
  await dismissTelemetryPromptIfPresent(page);
  await dismissTourIfPresent(page);
}

async function acceptEula(page: Page): Promise<void> {
  await page.locator("#eula-agree").check();
  await page.locator("#sign").click();
  await page.waitForURL(/\/(setup|join|game)/, { timeout: 30_000 });
}

async function createWorld(page: Page): Promise<void> {
  await page.locator('button[data-action="worldCreate"]').click();
  const form = page.locator("#world-create");
  await form.locator('input[name="title"]').fill(WORLD_TITLE);

  const worldIdInput = form.locator('input[name="world-id"]');
  if (await worldIdInput.count()) {
    await worldIdInput.fill(WORLD_ID);
  }

  // The system field is a native <select> for form submission, but the
  // visible, clickable control is a package card grid instead.
  const systemCard = form.locator(
    `li[data-package-id="${SYSTEM_ID}"][data-action="selectPackage"]`,
  );
  if (await systemCard.count()) {
    const isActive = await systemCard
      .first()
      .evaluate((el) => el.classList.contains("active"));
    if (!isActive) await systemCard.first().click();
  } else {
    await form.locator('select[name="system"]').selectOption(SYSTEM_ID);
  }

  await form.locator('button[type="submit"]').click();
  await page.waitForURL(/\/(players|join|game)/, { timeout: 60_000 });

  // World creation lands on a one-time "User Management" screen before the
  // join screen; save the default (passwordless) Gamemaster user to proceed.
  if (new URL(page.url()).pathname === "/players") {
    await dismissOverlaysIfPresent(page);
    await page.locator('#manage-players button[type="submit"]').click();
    await page.waitForURL(/\/(join|game)/, { timeout: 60_000 });
  }
}

async function launchExistingWorld(page: Page): Promise<void> {
  const card = page.locator(`li[data-package-id="${WORLD_ID}"]`);
  // The launch control is only revealed on hover of the world card.
  await card.hover();
  await card.locator('a[data-action="worldLaunch"]').click();
  await page.waitForURL(/\/(players|join|game)/, { timeout: 60_000 });

  if (new URL(page.url()).pathname === "/players") {
    await dismissOverlaysIfPresent(page);
    await page.locator('#manage-players button[type="submit"]').click();
    await page.waitForURL(/\/(join|game)/, { timeout: 60_000 });
  }
}

async function joinAsGM(page: Page): Promise<void> {
  const form = page.locator("#join-game-form");
  await form
    .locator('select[name="userid"]')
    .selectOption({ label: GM_USER_LABEL });

  const gmPassword = process.env.FOUNDRY_E2E_GM_PASSWORD;
  if (gmPassword) {
    await form.locator('input[name="password"]').fill(gmPassword);
  }

  await form.locator('button[type="submit"]').click();
  await page.waitForURL(/\/game/, { timeout: 60_000 });
}

export async function waitForGameReady(page: Page): Promise<void> {
  await page.waitForFunction(
    (systemId) =>
      typeof game !== "undefined" &&
      game.ready === true &&
      game.system.id === systemId,
    SYSTEM_ID,
    { timeout: 60_000 },
  );

  const isGM = await page.evaluate(() => game.user?.isGM === true);
  if (!isGM) throw new Error("Authenticated Foundry user is not a Gamemaster.");

  // A permanent "no hardware acceleration" notification is expected in this
  // headless/GPU-less environment and can visually block sheet controls.
  await page.evaluate(() => ui.notifications.clear());
  await dismissOverlaysIfPresent(page);
}

/**
 * Drives the page from whatever valid starting state it's in through to an
 * authenticated, ready GM game view. Used by both global setup (first
 * bootstrap: may need to create/launch the world) and by tests navigating
 * fresh pages (should already be joined via storageState, but re-joins if
 * the session wasn't restored).
 */
export async function ensureGameView(page: Page): Promise<void> {
  await dismissOverlaysIfPresent(page);
  let state = await detectState(page);

  if (state === "license") {
    await acceptEula(page);
    await dismissOverlaysIfPresent(page);
    state = await detectState(page);
  }

  if (state === "setup-no-world") {
    await dismissOverlaysIfPresent(page);
    await createWorld(page);
    await dismissOverlaysIfPresent(page);
    state = await detectState(page);
  } else if (state === "setup-world-not-launched") {
    await dismissOverlaysIfPresent(page);
    await launchExistingWorld(page);
    await dismissOverlaysIfPresent(page);
    state = await detectState(page);
  }

  if (state === "join") {
    await joinAsGM(page);
    await dismissOverlaysIfPresent(page);
    state = await detectState(page);
  }

  if (state !== "game") {
    const diagnostics = await captureDiagnostics(page, "unexpected-state");
    throw new Error(
      `Unexpected Foundry page state (detected: "${state}"). ${diagnostics}\n` +
        "Expected one of: license screen, setup screen (with or without the 100dos-e2e world), " +
        "join screen, or game view.",
    );
  }

  await waitForGameReady(page);
}
