import { expect, test } from "./support/diagnostics.js";
import { resetFixtures } from "./support/fixtures.js";
import { ensureGameView } from "./support/foundry-session.js";
import { openPcSheet, resizePcSheet } from "./support/pc-sheet.js";
import { type Locator, type Page } from "@playwright/test";

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

async function openRecordTab(page: Page, sheetId: string, tabId: string): Promise<Locator> {
  const sheet = page.locator(`#${sheetId}`);
  await sheet.locator('[role="tab"][data-group="primary"][data-tab="record"]').click();
  await sheet.locator(`[role="tab"][data-group="record"][data-tab="${tabId}"]`).click();
  return sheet.locator(`.tab[data-group="record"][data-tab="${tabId}"]`);
}

test.beforeEach(async ({ page, baseURL }) => {
  await page.goto(baseURL ?? "/");
  await ensureGameView(page);
});

test.describe("XP ledger page", () => {
  test("a new PC has ExperienceLedger schema defaults", async ({ page }) => {
    const { actorId } = await resetFixtures(page);
    const xp = await page.evaluate((actorId) => game.actors.get(actorId)?.system.xp, actorId);
    expect(xp).toEqual({ tier: 0, earned: 0, spent: 0, available: 0, ledger: [] });
  });

  test("summary fields and ledger rows render from schema data; an unresolved recorder falls back to a neutral label", async ({
    page,
  }) => {
    const { actorId } = await resetFixtures(page);
    await updateActor(page, actorId, {
      "system.xp": {
        tier: 5,
        earned: 2450,
        spent: 1900,
        available: 550,
        ledger: [
          {
            type: "reward",
            description: "Completed Investigation",
            value: 100,
            recordedBy: null,
            worldTime: 123,
            realTime: Date.now(),
          },
        ],
      },
    });
    const sheetId = await openPcSheet(page, actorId);
    const panel = await openRecordTab(page, sheetId, "xp");

    const summaryCells = panel.locator(".simple-stat-table > div > div");
    await expect(summaryCells).toHaveCount(4);
    await expect(summaryCells.nth(0)).toContainText("2,450");
    await expect(summaryCells.nth(1)).toContainText("1,900");
    await expect(summaryCells.nth(2)).toContainText("550");
    await expect(summaryCells.nth(3)).toContainText("5");
    await expect(summaryCells.locator("input")).toHaveCount(0);

    const row = panel.locator("tbody tr").first();
    await expect(row).toContainText("Reward");
    await expect(row).toContainText("Completed Investigation");
    await expect(row.locator("td.ledger-table-value")).toHaveText("100");
    await expect(row).toContainText("123");
    await expect(row).toContainText("Unknown");
  });

  test("the action column has no textual header and carries labeled Add/Delete icon controls", async ({ page }) => {
    const { actorId } = await resetFixtures(page);
    await updateActor(page, actorId, {
      "system.xp.ledger": [
        { type: "purchase", description: "Strength Advancement", value: 50, recordedBy: null, worldTime: 0, realTime: Date.now() },
      ],
    });
    const sheetId = await openPcSheet(page, actorId);
    const panel = await openRecordTab(page, sheetId, "xp");

    const actionHeader = panel.locator("thead th").last();
    await expect(actionHeader).toHaveText("");
    await expect(actionHeader.locator('a[role="button"]')).toHaveAttribute("aria-label", "Add XP Transaction");

    const deleteControl = panel.locator("tbody tr").first().locator('a[role="button"]');
    await expect(deleteControl).toHaveAttribute("aria-label", "Delete transaction: Strength Advancement");
  });

  test("an empty ledger still shows the summary, headings, Add control, and an intentional empty state", async ({ page }) => {
    const { actorId } = await resetFixtures(page);
    const sheetId = await openPcSheet(page, actorId);
    const panel = await openRecordTab(page, sheetId, "xp");

    await expect(panel.locator(".simple-stat-table")).toBeVisible();
    await expect(panel.locator('thead a[role="button"]')).toBeVisible();
    await expect(panel.locator("tbody tr")).toHaveCount(1);
    await expect(panel.locator(".ledger-table-empty-state")).toHaveText("No XP transactions recorded yet.");
  });
});

test.describe("Finances ledger page", () => {
  test("a new PC has Finances schema defaults", async ({ page }) => {
    const { actorId } = await resetFixtures(page);
    const finances = await page.evaluate((actorId) => game.actors.get(actorId)?.system.finances, actorId);
    expect(finances).toEqual({ received: 0, spent: 0, available: 0, carried: 0, ledger: [] });
  });

  test("summary fields and ledger rows render from schema data; an unresolved recorder falls back to a neutral label", async ({
    page,
  }) => {
    const { actorId } = await resetFixtures(page);
    await updateActor(page, actorId, {
      "system.finances": {
        received: 3200,
        spent: 2650,
        available: 550,
        ledger: [
          {
            id: "a",
            type: "income",
            description: "Mission Payment",
            value: 1000,
            recordedBy: null,
            worldTime: 123,
            realTime: Date.now(),
          },
        ],
      },
    });
    const sheetId = await openPcSheet(page, actorId);
    const panel = await openRecordTab(page, sheetId, "finances");

    const summaryCells = panel.locator(".simple-stat-table > div > div");
    await expect(summaryCells).toHaveCount(3);
    await expect(summaryCells.nth(0)).toContainText("3,200");
    await expect(summaryCells.nth(1)).toContainText("2,650");
    await expect(summaryCells.nth(2)).toContainText("550");
    await expect(summaryCells.locator("input")).toHaveCount(0);

    const row = panel.locator("tbody tr").first();
    await expect(row).toContainText("Income");
    await expect(row).toContainText("Mission Payment");
    await expect(row.locator("td.ledger-table-value")).toHaveText("1,000");
    await expect(row).toContainText("123");
    await expect(row).toContainText("Unknown");
  });

  test("the action column has no textual header and carries labeled Add/Delete icon controls", async ({ page }) => {
    const { actorId } = await resetFixtures(page);
    await updateActor(page, actorId, {
      "system.finances.ledger": [
        { id: "a", type: "purchase", description: "Battle Rifle", value: 600, recordedBy: null, worldTime: 0, realTime: Date.now() },
      ],
    });
    const sheetId = await openPcSheet(page, actorId);
    const panel = await openRecordTab(page, sheetId, "finances");

    const actionHeader = panel.locator("thead th").last();
    await expect(actionHeader).toHaveText("");
    await expect(actionHeader.locator('a[role="button"]')).toHaveAttribute("aria-label", "Add Finance Transaction");

    const deleteControl = panel.locator("tbody tr").first().locator('a[role="button"]');
    await expect(deleteControl).toHaveAttribute("aria-label", "Delete transaction: Battle Rifle");
  });

  test("an empty ledger still shows the summary, headings, Add control, and an intentional empty state", async ({ page }) => {
    const { actorId } = await resetFixtures(page);
    const sheetId = await openPcSheet(page, actorId);
    const panel = await openRecordTab(page, sheetId, "finances");

    await expect(panel.locator(".simple-stat-table")).toBeVisible();
    await expect(panel.locator('thead a[role="button"]')).toBeVisible();
    await expect(panel.locator("tbody tr")).toHaveCount(1);
    await expect(panel.locator(".ledger-table-empty-state")).toHaveText("No finance transactions recorded yet.");
  });

  test("values render as locale-formatted numbers with no currency symbol", async ({ page }) => {
    const { actorId } = await resetFixtures(page);
    await updateActor(page, actorId, {
      "system.finances.ledger": [
        { id: "a", type: "income", description: "Payment", value: 2500000, recordedBy: null, worldTime: 0, realTime: Date.now() },
      ],
    });
    const sheetId = await openPcSheet(page, actorId);
    const panel = await openRecordTab(page, sheetId, "finances");
    await expect(panel.locator("tbody tr").first().locator("td.ledger-table-value")).toHaveText("2,500,000");
  });
});

test("XP and Finances ledgers remain usable, without whole-sheet overflow, at representative sheet widths", async ({ page }) => {
  const { actorId } = await resetFixtures(page);
  await updateActor(page, actorId, {
    "system.xp.ledger": [
      { type: "reward", description: "Completed Investigation", value: 100, recordedBy: null, worldTime: 0, realTime: Date.now() },
    ],
    "system.finances.ledger": [
      { id: "a", type: "income", description: "Mission Payment", value: 1000, recordedBy: null, worldTime: 0, realTime: Date.now() },
    ],
  });
  const sheetId = await openPcSheet(page, actorId);
  const sheet = page.locator(`#${sheetId}`);

  for (const width of [1000, 720, 360]) {
    await resizePcSheet(page, sheetId, width);
    for (const tabId of ["xp", "finances"]) {
      const panel = await openRecordTab(page, sheetId, tabId);
      const sheetBox = await sheet.boundingBox();
      const wrapBox = await panel.locator(".ledger-table-wrap").boundingBox();
      expect(sheetBox).not.toBeNull();
      expect(wrapBox).not.toBeNull();
      expect(wrapBox!.width).toBeLessThanOrEqual(sheetBox!.width + 1);
    }
  }
});
