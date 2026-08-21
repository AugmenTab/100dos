import { expect, test } from "./support/diagnostics.js";
import { resetFixtures } from "./support/fixtures.js";
import { ensureGameView } from "./support/foundry-session.js";
import { openPcSheet, rerenderPcSheet, resizePcSheet } from "./support/pc-sheet.js";
import { getActorSnapshot } from "./support/state.js";
import { type Page } from "@playwright/test";

const PRIMARY_TAB_IDS = [
  "dashboard",
  "record",
  "combat",
  "medical",
  "inventory",
  "features",
  "skills",
  "spells",
  "effects",
  "settings",
];

const PRIMARY_TAB_LABELS = [
  "Dashboard",
  "Record",
  "Combat",
  "Medical",
  "Inventory",
  "Features",
  "Skills",
  "Spells",
  "Effects",
  "Settings",
];

const RECORD_TAB_IDS = ["basics", "xp", "finances", "biography", "notes"];

async function updateActor(page: Page, actorId: string, data: Record<string, unknown>): Promise<void> {
  await page.evaluate(
    async ({ actorId, data }) => {
      const actor = game.actors.get(actorId);
      if (!actor) throw new Error(`Fixture actor ${actorId} not found.`);
      await actor.update(data);
    },
    { actorId, data },
  );
}

function primaryTab(sheet: ReturnType<Page["locator"]>, tabId: string) {
  return sheet.locator(`[role="tab"][data-group="primary"][data-tab="${tabId}"]`);
}

function primaryPanel(sheet: ReturnType<Page["locator"]>, tabId: string) {
  return sheet.locator(`.tab[data-group="primary"][data-tab="${tabId}"]`);
}

function recordTab(sheet: ReturnType<Page["locator"]>, tabId: string) {
  return sheet.locator(`[role="tab"][data-group="record"][data-tab="${tabId}"]`);
}

function recordPanel(sheet: ReturnType<Page["locator"]>, tabId: string) {
  return sheet.locator(`.tab[data-group="record"][data-tab="${tabId}"]`);
}

test.beforeEach(async ({ page, baseURL }) => {
  await page.goto(baseURL ?? "/");
  await ensureGameView(page);
});

test("PC sheet shows the primary tab shell, defaults to Dashboard, and switches between primary tabs", async ({
  page,
}) => {
  const { actorId } = await resetFixtures(page);
  // The Spells tab/panel only render once system.spells is populated (see
  // pc-sheet.ts) — set here so this general navigation test still exercises
  // the sheet's full ten-tab set. The null-hides-it behavior itself has its
  // own dedicated test below. A non-empty object, not {} — Foundry's update
  // diffing treats merging {} into a null field as no actual change, so it
  // never leaves system.spells.
  await updateActor(page, actorId, { "system.spells": { placeholder: true } });
  const sheetId = await openPcSheet(page, actorId);
  const sheet = page.locator(`#${sheetId}`);

  const primaryNav = sheet.locator('[role="tablist"][data-group="primary"]');
  await expect(primaryNav.locator('[role="tab"]')).toHaveText(PRIMARY_TAB_LABELS);

  await expect(primaryTab(sheet, "dashboard")).toHaveAttribute("aria-selected", "true");
  await expect(primaryPanel(sheet, "dashboard")).toBeVisible();
  await expect(sheet.locator('input[name="name"]')).toBeVisible();

  let previous = "dashboard";
  for (const tabId of PRIMARY_TAB_IDS) {
    await primaryTab(sheet, tabId).click();

    await expect(primaryTab(sheet, tabId)).toHaveAttribute("aria-selected", "true");
    await expect(primaryPanel(sheet, tabId)).toBeVisible();
    if (tabId !== previous) {
      await expect(primaryTab(sheet, previous)).toHaveAttribute("aria-selected", "false");
      await expect(primaryPanel(sheet, previous)).toBeHidden();
    }
    if (tabId === "dashboard") {
      await expect(sheet.locator('input[name="name"]')).toBeVisible();
    } else if (tabId !== "record" && tabId !== "skills" && tabId !== "effects") {
      await expect(primaryPanel(sheet, tabId).locator("h2")).toBeVisible();
    }

    previous = tabId;
  }

  await primaryTab(sheet, "dashboard").click();
  const nameInput = sheet.locator('input[name="name"]');
  await nameInput.fill("[E2E] PC Nav Renamed");
  await nameInput.blur();

  await expect
    .poll(async () => (await getActorSnapshot(page, actorId)).name)
    .toBe("[E2E] PC Nav Renamed");
});

test("the Spells tab and its panel are absent while system.spells is null, and appear once it's populated", async ({
  page,
}) => {
  const { actorId } = await resetFixtures(page);
  const sheetId = await openPcSheet(page, actorId);
  const sheet = page.locator(`#${sheetId}`);

  await expect(primaryTab(sheet, "spells")).toHaveCount(0);
  await expect(primaryPanel(sheet, "spells")).toHaveCount(0);

  // A non-empty object, not {} — Foundry's update diffing treats merging
  // {} into a null field as no actual change, so it never leaves null.
  await updateActor(page, actorId, { "system.spells": { placeholder: true } });
  await rerenderPcSheet(page, actorId);

  await expect(primaryTab(sheet, "spells")).toHaveCount(1);
  await expect(primaryPanel(sheet, "spells")).toHaveCount(1);

  await primaryTab(sheet, "spells").click();
  await expect(primaryPanel(sheet, "spells")).toBeVisible();
});

test("Record remembers its most recent secondary tab across navigation and rerenders", async ({ page }) => {
  const { actorId } = await resetFixtures(page);
  const sheetId = await openPcSheet(page, actorId);
  const sheet = page.locator(`#${sheetId}`);

  await primaryTab(sheet, "record").click();
  await expect(recordTab(sheet, "basics")).toHaveAttribute("aria-selected", "true");

  await recordTab(sheet, "xp").click();
  await expect(recordTab(sheet, "xp")).toHaveAttribute("aria-selected", "true");

  await primaryTab(sheet, "combat").click();
  await primaryTab(sheet, "record").click();
  await expect(recordTab(sheet, "xp")).toHaveAttribute("aria-selected", "true");
  await expect(recordPanel(sheet, "xp")).toBeVisible();

  await recordTab(sheet, "finances").click();
  await rerenderPcSheet(page, actorId);
  await expect(primaryTab(sheet, "record")).toHaveAttribute("aria-selected", "true");
  await expect(recordTab(sheet, "finances")).toHaveAttribute("aria-selected", "true");
  await expect(recordPanel(sheet, "finances")).toBeVisible();

  await recordTab(sheet, "biography").click();
  await rerenderPcSheet(page, actorId);
  await expect(primaryTab(sheet, "record")).toHaveAttribute("aria-selected", "true");
  await expect(recordTab(sheet, "biography")).toHaveAttribute("aria-selected", "true");
  await expect(recordPanel(sheet, "biography")).toBeVisible();
});

test("primary and Record tab lists support keyboard navigation independently", async ({ page }) => {
  const { actorId } = await resetFixtures(page);
  const sheetId = await openPcSheet(page, actorId);
  const sheet = page.locator(`#${sheetId}`);

  const dashboardTab = primaryTab(sheet, "dashboard");
  const recordPrimaryTab = primaryTab(sheet, "record");
  const settingsTab = primaryTab(sheet, "settings");

  await dashboardTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(recordPrimaryTab).toBeFocused();
  // Moving focus with the arrow key must not activate the tab by itself.
  await expect(recordPrimaryTab).toHaveAttribute("aria-selected", "false");
  await expect(dashboardTab).toHaveAttribute("aria-selected", "true");

  await page.keyboard.press("Enter");
  await expect(recordPrimaryTab).toHaveAttribute("aria-selected", "true");
  await expect(primaryPanel(sheet, "record")).toBeVisible();

  await recordPrimaryTab.focus();
  await page.keyboard.press("End");
  await expect(settingsTab).toBeFocused();
  await page.keyboard.press("Home");
  await expect(dashboardTab).toBeFocused();

  await recordPrimaryTab.click();
  const basicsTab = recordTab(sheet, "basics");
  const xpTab = recordTab(sheet, "xp");
  const notesTab = recordTab(sheet, "notes");

  await basicsTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(xpTab).toBeFocused();
  await page.keyboard.press(" ");
  await expect(xpTab).toHaveAttribute("aria-selected", "true");

  // Activity within the Record tablist must not disturb the primary selection.
  await expect(recordPrimaryTab).toHaveAttribute("aria-selected", "true");

  // Arrow navigation wraps from the last tab back to the first.
  await notesTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(basicsTab).toBeFocused();
});

test("primary and Record navigation remain usable at representative sheet widths", async ({ page }) => {
  const { actorId } = await resetFixtures(page);
  const sheetId = await openPcSheet(page, actorId);
  const sheet = page.locator(`#${sheetId}`);
  const primaryNav = sheet.locator('[role="tablist"][data-group="primary"]');

  // Narrow is chosen so that all ten primary labels cannot fit on one line
  // and the row must rely on horizontal scrolling.
  const widths = [1000, 720, 360];
  for (const width of widths) {
    await resizePcSheet(page, sheetId, width);

    const sheetBox = await sheet.boundingBox();
    const navBox = await primaryNav.boundingBox();
    expect(sheetBox).not.toBeNull();
    expect(navBox).not.toBeNull();
    expect(navBox!.width).toBeLessThanOrEqual(sheetBox!.width + 1);

    const settingsTab = primaryTab(sheet, "settings");
    await settingsTab.scrollIntoViewIfNeeded();
    await settingsTab.click();
    await expect(settingsTab).toHaveAttribute("aria-selected", "true");
    await expect(primaryPanel(sheet, "settings")).toBeVisible();

    await primaryTab(sheet, "record").click();
    const recordNav = sheet.locator('[role="tablist"][data-group="record"]');
    await expect(recordNav).toBeVisible();
    const recordNavBox = await recordNav.boundingBox();
    expect(recordNavBox).not.toBeNull();
    expect(recordNavBox!.width).toBeLessThanOrEqual(sheetBox!.width + 1);

    for (const tabId of RECORD_TAB_IDS) {
      const tab = recordTab(sheet, tabId);
      await tab.scrollIntoViewIfNeeded();
      await tab.click();
      await expect(tab).toHaveAttribute("aria-selected", "true");
      await expect(recordPanel(sheet, tabId)).toBeVisible();
    }
  }
});
