// Trait reuses the same abstract Item shell, Description tab, and Changes
// tab as Ability (see .local/plan.md's "Trait Item Sheet Wireframe
// Handoff") — item-sheet-ability.spec.ts already exhaustively covers that
// shared machinery's own behavior (Change/Conditional column content,
// mode symbols, empty states, ...), so these tests focus on what's
// actually Trait-specific: that the shared shell renders correctly when
// bound to Trait's own document/data, not re-deriving every assertion
// already proven generically against Ability.
import { expect, test } from "./support/diagnostics.js";
import { resetTraitFixtures } from "./support/fixtures.js";
import { openItemSheet, openTab, updateItem } from "./support/item-sheet.js";
// Despite the name, this only calls setPosition on the given sheetId — no
// Actor/PC-sheet assumptions — so it works for an Item sheet too.
import { resizePcSheet as resizeSheet } from "./support/pc-sheet.js";

test("the Trait sheet opens using the reusable abstract Item shell: header, sidebar heading, and Description/Details/Changes/Links navigation", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId, itemId } = await resetTraitFixtures(page, fixtureLane);
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);

  await expect(sheet.locator(".dos100-item-portrait")).toHaveAttribute("src", /.+/);
  await expect(sheet.locator('input[name="name"]')).toHaveValue("[E2E] Trait");
  await expect(sheet.locator(".dos100-item-sidebar")).toContainText("Trait");

  const tabLabels = await sheet.locator('[role="tab"][data-group="primary"]').allTextContents();
  expect(tabLabels).toEqual(["Description", "Details", "Changes", "Links"]);
});

test("sidebar checkboxes are ordered Active, Pinned, Combat Tab and bind to their schema fields", async ({ foundryPage: page, fixtureLane }) => {
  const { actorId, itemId } = await resetTraitFixtures(page, fixtureLane);
  await updateItem(page, actorId, itemId, {
    "system.active": true,
    "system.actions.pinned": true,
    "system.showInCombatTab": true,
  });
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);

  const checkboxes = sheet.locator(".dos100-item-checkbox input[type=checkbox]");
  await expect(checkboxes).toHaveCount(3);
  await expect(checkboxes.nth(0)).toHaveAttribute("name", "system.active");
  await expect(checkboxes.nth(1)).toHaveAttribute("name", "system.actions.pinned");
  await expect(checkboxes.nth(2)).toHaveAttribute("name", "system.showInCombatTab");
  for (const checkbox of await checkboxes.all()) {
    await expect(checkbox).toBeChecked();
  }
});

test("sidebar Tags render from system.tags", async ({ foundryPage: page, fixtureLane }) => {
  const { actorId, itemId } = await resetTraitFixtures(page, fixtureLane);
  await updateItem(page, actorId, itemId, { "system.tags": ["sensory", "innate"] });
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);

  const chips = sheet.locator(".dos100-item-sidebar .dos100-item-tag");
  await expect(chips).toHaveCount(2);
  await expect(chips.nth(0)).toHaveText("sensory");
  await expect(chips.nth(1)).toHaveText("innate");
});

test("Description reuses the shared rich-text template bound to system.description; Details tab renders shared Actions, uses, notes, and Advanced sections", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId, itemId } = await resetTraitFixtures(page, fixtureLane);
  await updateItem(page, actorId, itemId, { "system.description": "<p>Sample Trait description.</p>" });
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);

  // <prose-mirror> consumes/clears its initial `value` attribute once the
  // editor mounts (it manages content internally from there), so assert on
  // the rendered editor content rather than the attribute.
  const editor = sheet.locator('prose-mirror[name="system.description"]');
  await expect(editor).toContainText("Sample Trait description.");

  await openTab(sheet, "details");
  const detailsPanel = sheet.locator('.tab[data-tab="details"].active');
  await expect(detailsPanel.locator("table.dense-table")).toHaveCount(3);
  await expect(detailsPanel.locator('select[name="system.actions.uses.per"]')).toBeVisible();
  await expect(detailsPanel.locator(".dos100-item-advanced")).toBeVisible();
});

test("the Changes tab reuses the shared implementation, rendering both tables against Trait's own system.changes data", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId, itemId } = await resetTraitFixtures(page, fixtureLane);
  await updateItem(page, actorId, itemId, {
    "system.changes.computed": [
      { target: "strMod", mode: "add", formula: "3", source: { id: "test", name: "Test" } },
    ],
    "system.changes.conditional": [
      { target: "strMod", value: "When ambushed, roll Initiative twice and keep the higher result.", source: { id: "test", name: "Test" } },
    ],
  });
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);
  await openTab(sheet, "changes");
  const panel = sheet.locator('.tab[data-tab="changes"].active');
  const tables = panel.locator("table.dense-table");
  await expect(tables).toHaveCount(2);

  const changeRow = tables.nth(0).locator("tbody tr").nth(0);
  await expect(changeRow.locator("td").nth(0)).toHaveText("+");
  await expect(changeRow.locator("td").nth(1).locator("input")).toHaveValue("3");
  await expect(changeRow.locator("td").nth(2).locator("code")).toHaveText("Strength Mod");

  const conditionalRow = tables.nth(1).locator("tbody tr").nth(0);
  await expect(conditionalRow.locator("td").nth(0).locator("textarea")).toHaveValue(
    "When ambushed, roll Initiative twice and keep the higher result.",
  );
  await expect(conditionalRow.locator("td").nth(1).locator("code")).toHaveText("Strength Mod");
});

test("the Trait sheet remains usable, without whole-sheet overflow, at representative Item-sheet widths", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId, itemId } = await resetTraitFixtures(page, fixtureLane);
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);

  for (const width of [800, 640, 480]) {
    await resizeSheet(page, sheetId, width);
    const shell = sheet.locator(".dos100-item-shell");
    await expect(shell).toBeVisible();
    const overflow = await shell.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  }
});
