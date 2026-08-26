// Structural Links tab tests (sub-tab nav, notices, table layout, empty
// states, overflow) live in test/browser/item-sheet-links.spec.ts — they
// only need static rendering. This file covers the one test that genuinely
// requires a live Foundry world: verifying that the Links tab resolves its
// rows from the existing grant system (childItemIds/supplementItemIds flags
// set by _onCreate/_createGrants) rather than a parallel model.
import { expect, test } from "./support/diagnostics.js";
import { resetLinksFixtures } from "./support/fixtures.js";
import { openItemSheet, openTab } from "./support/item-sheet.js";

test("Links tab rows resolve from the grant system: child and supplement items appear from childItemIds/supplementItemIds flags", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId, grantingItemId } = await resetLinksFixtures(page, fixtureLane);
  const sheetId = await openItemSheet(page, actorId, grantingItemId);
  const sheet = page.locator(`#${sheetId}`);
  await openTab(sheet, "links");

  const childrenPanel = sheet.locator('.tab[data-group="links"][data-tab="children"].active');
  const childRow = childrenPanel.locator("table.dense-table tbody tr").nth(0);
  await expect(childRow.locator("td").nth(0).locator("img")).toHaveAttribute("src", /.+/);
  await expect(childRow.locator("td").nth(0)).toContainText("[E2E] Child Trait");
  const childButtons = childRow.locator("td").nth(1).locator("a.icon-button");
  await expect(childButtons).toHaveCount(2);
  await expect(childButtons.nth(0)).toHaveAttribute("aria-label", "Edit child item");
  await expect(childButtons.nth(1)).toHaveAttribute("aria-label", "Delete child item");
  for (const btn of await childButtons.all()) await expect(btn).not.toHaveAttribute("data-action");

  await sheet.locator('[role="tab"][data-group="links"][data-tab="supplements"]').click();
  const supplementsPanel = sheet.locator('.tab[data-group="links"][data-tab="supplements"].active');
  const supplementRow = supplementsPanel.locator("table.dense-table tbody tr").nth(0);
  await expect(supplementRow.locator("td").nth(0).locator("img")).toHaveAttribute("src", /.+/);
  await expect(supplementRow.locator("td").nth(0)).toContainText("[E2E] Supplement Trait");
  const supplementButtons = supplementRow.locator("td").nth(1).locator("a.icon-button");
  await expect(supplementButtons).toHaveCount(2);
  await expect(supplementButtons.nth(0)).toHaveAttribute("aria-label", "Edit supplement item");
  await expect(supplementButtons.nth(1)).toHaveAttribute("aria-label", "Delete supplement item");
  for (const btn of await supplementButtons.all()) await expect(btn).not.toHaveAttribute("data-action");
});
