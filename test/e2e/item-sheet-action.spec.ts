import { expect, test } from "./support/diagnostics.js";
import { resetFixtures } from "./support/fixtures.js";
import { openItemSheet, openTab, updateItem } from "./support/item-sheet.js";

const ACTION_STUB = {
  activation: { type: "full" as const, cost: null },
  uses: { per: "unlimited" as const, value: 0, max: 0, cost: 1, formula: { max: "", cost: "" } },
};

async function seedAction(
  page: Parameters<typeof updateItem>[0],
  actorId: string,
  itemId: string,
  actionId: string,
  name: string,
): Promise<void> {
  await updateItem(page, actorId, itemId, {
    [`system.actions.items.${actionId}`]: { id: actionId, name, ...ACTION_STUB },
  });
}

// Open the action sheet once and share it across the three tests that need it.
test.describe("Action editor", () => {
  let sheetId: string;

  test.beforeAll(async ({ foundryPage: page, fixtureLane }) => {
    for (const btn of await page.locator(".action-sheet [data-action='close']").all()) {
      await btn.click();
    }
    const { actorId, itemId } = await resetFixtures(page, fixtureLane);
    const actionId = await page.evaluate(() => foundry.utils.randomID());
    await seedAction(page, actorId, itemId, actionId, "Slash");
    sheetId = await openItemSheet(page, actorId, itemId);
    const sheet = page.locator(`#${sheetId}`);
    await openTab(sheet, "details");
    await sheet.locator('.tab[data-tab="details"].active').locator(`a[data-action="editAction"]`).click();
    await page.locator(".action-sheet").first().waitFor({ state: "visible" });
  });

  test("Clicking Edit on an Action row opens the Action editor", async ({ foundryPage: page }) => {
    await expect(page.locator(".action-sheet")).toBeVisible();
  });

  test("Tab switching works in the Action editor", async ({ foundryPage: page }) => {
    const actionSheet = page.locator(".action-sheet");
    for (const tabId of ["usage", "action", "miscellaneous", "description"]) {
      await actionSheet.locator(`[role="tab"][data-group="primary"][data-tab="${tabId}"]`).click();
      await expect(actionSheet.locator(`.tab[data-tab="${tabId}"].active`)).toBeVisible();
    }
  });

  test("Closing the Action editor does not close the parent Item sheet", async ({ foundryPage: page }) => {
    const actionSheet = page.locator(".action-sheet");
    const sheet = page.locator(`#${sheetId}`);
    await actionSheet.locator('[data-action="close"]').click();
    await expect(actionSheet).not.toBeVisible();
    await expect(sheet).toBeVisible();
  });
});

test("The editor opens for the selected Action, not another row", async ({ foundryPage: page, fixtureLane }) => {
  const { actorId, itemId } = await resetFixtures(page, fixtureLane);
  const [id1, id2] = await page.evaluate(() => [foundry.utils.randomID(), foundry.utils.randomID()]);
  await seedAction(page, actorId, itemId, id1, "Slash");
  await seedAction(page, actorId, itemId, id2, "Stab");

  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);
  await openTab(sheet, "details");
  const panel = sheet.locator('.tab[data-tab="details"].active');

  await panel.locator(`a[data-action="editAction"][data-identifier="${id2}"]`).click();
  const actionSheet = page.locator(".action-sheet");
  await expect(actionSheet).toBeVisible();
  await expect(actionSheet.locator(".window-header")).toContainText("Stab");
  await expect(actionSheet.locator(".window-header")).not.toContainText("Slash");
  await actionSheet.locator('[data-action="close"]').click();
});
