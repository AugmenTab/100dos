import { expect, test } from "./support/diagnostics.js";
import { resetFixtures } from "./support/fixtures.js";
// Despite the name, this only calls setPosition on the given sheetId — no
// Actor/PC-sheet assumptions — so it works for an Item sheet too.
import { resizePcSheet as resizeSheet } from "./support/pc-sheet.js";
import { type Locator, type Page } from "@playwright/test";

async function updateItem(page: Page, actorId: string, itemId: string, data: Record<string, unknown>): Promise<void> {
  await page.evaluate(
    async ({ actorId, itemId, data }) => {
      const item = game.actors.get(actorId)?.items.get(itemId);
      if (!item) throw new Error(`Fixture Ability ${itemId} not found on actor ${actorId}.`);
      await item.update(data);
    },
    { actorId, itemId, data },
  );
}

async function openItemSheet(page: Page, actorId: string, itemId: string): Promise<string> {
  return page.evaluate(
    async ({ actorId, itemId }) => {
      const item = game.actors.get(actorId)?.items.get(itemId);
      if (!item) throw new Error(`Fixture Ability ${itemId} not found on actor ${actorId}.`);
      await item.sheet.render(true);
      return item.sheet.id;
    },
    { actorId, itemId },
  );
}

async function openTab(sheet: Locator, tabId: string): Promise<void> {
  await sheet.locator(`[role="tab"][data-group="primary"][data-tab="${tabId}"]`).click();
}

test("sidebar checkboxes are ordered Active, Pinned, Combat Tab and bind to their schema fields", async ({ foundryPage: page, fixtureLane }) => {
  const { actorId, itemId } = await resetFixtures(page, fixtureLane);
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

  await checkboxes.nth(0).uncheck();
  await expect
    .poll(async () => (await page.evaluate(
      ({ actorId, itemId }) => game.actors.get(actorId)?.items.get(itemId)?.system.active,
      { actorId, itemId },
    )))
    .toBe(false);
});

test("the name field carries the shared depleted (gray/strikethrough) treatment when the Ability is inactive", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId, itemId } = await resetFixtures(page, fixtureLane);
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);
  const nameInput = sheet.locator('input[name="name"]');

  await expect(nameInput).not.toHaveClass(/depleted/);

  await updateItem(page, actorId, itemId, { "system.active": false });
  await page.evaluate(({ actorId, itemId }) => game.actors.get(actorId)?.items.get(itemId)?.sheet.render(true), {
    actorId,
    itemId,
  });
  await expect(nameInput).toHaveClass(/depleted/);
});

test("Description renders the rich-text editor bound to system.description; Details is a selectable placeholder", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId, itemId } = await resetFixtures(page, fixtureLane);
  await updateItem(page, actorId, itemId, { "system.description": "<p>Sample description.</p>" });
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);

  // <prose-mirror> consumes/clears its initial `value` attribute once the
  // editor mounts (it manages content internally from there), so assert on
  // the rendered editor content rather than the attribute.
  const editor = sheet.locator('prose-mirror[name="system.description"]');
  await expect(editor).toContainText("Sample description.");

  await openTab(sheet, "details");
  await expect(sheet.locator('.tab[data-tab="details"].active')).toContainText("Details");
  await expect(sheet.locator('.tab[data-tab="details"].active')).toContainText("This page doesn't have any content yet.");
});

test("the Changes tab renders two dense tables, each with exactly one header row and no secondary column headers", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId, itemId } = await resetFixtures(page, fixtureLane);
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);
  await openTab(sheet, "changes");
  const panel = sheet.locator('.tab[data-tab="changes"].active');
  const tables = panel.locator("table.dense-table");
  await expect(tables).toHaveCount(2);

  const changesTable = tables.nth(0);
  const conditionalsTable = tables.nth(1);

  for (const table of [changesTable, conditionalsTable]) {
    await expect(table.locator("thead tr")).toHaveCount(1);
    await expect(table.locator("thead th")).toHaveCount(2);
    const headerText = await table.locator("thead").textContent();
    for (const forbidden of ["Mode", "Formula", "Target", "Notes", "Actions"]) {
      expect(headerText).not.toContain(forbidden);
    }
  }

  const changesLabelCell = changesTable.locator("thead th").nth(0);
  await expect(changesLabelCell).toHaveText("Changes");
  await expect(changesLabelCell).toHaveAttribute("colspan", "3");

  const conditionalsLabelCell = conditionalsTable.locator("thead th").nth(0);
  await expect(conditionalsLabelCell).toHaveText("Conditionals");
  await expect(conditionalsLabelCell).toHaveAttribute("colspan", "2");
});

test("the Changes and Conditionals headers carry Add affordances in their final header cell", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId, itemId } = await resetFixtures(page, fixtureLane);
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);
  await openTab(sheet, "changes");
  const panel = sheet.locator('.tab[data-tab="changes"].active');
  const tables = panel.locator("table.dense-table");

  const addChange = tables.nth(0).locator("thead th").nth(1).locator("a.icon-button");
  await expect(addChange).toHaveAttribute("aria-label", "Add Change");
  await expect(addChange).not.toHaveAttribute("data-action");

  const addConditional = tables.nth(1).locator("thead th").nth(1).locator("a.icon-button");
  await expect(addConditional).toHaveAttribute("aria-label", "Add Conditional");
  await expect(addConditional).not.toHaveAttribute("data-action");
});

test("Change rows display mode (as a compact symbol), formula, target, and Edit/Copy/Delete controls", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId, itemId } = await resetFixtures(page, fixtureLane);
  await updateItem(page, actorId, itemId, {
    "system.changes.computed": [
      {
        target: "strMod",
        mode: "add",
        formula: "@characteristics.agi.value / 2 + 5",
        source: { id: "test", name: "Test" },
      },
      {
        target: "strMod",
        mode: "set",
        formula: "50",
        source: { id: "test", name: "Test" },
      },
    ],
  });
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);
  await openTab(sheet, "changes");
  const panel = sheet.locator('.tab[data-tab="changes"].active');
  const rows = panel.locator("table.dense-table").nth(0).locator("tbody tr");
  await expect(rows).toHaveCount(2);

  const addRow = rows.nth(0);
  await expect(addRow.locator("td").nth(0)).toHaveText("+");
  await expect(addRow.locator("td").nth(0).locator("span")).toHaveAttribute("aria-label", "Add");
  const formulaInput = addRow.locator("td").nth(1).locator("input");
  await expect(formulaInput).toHaveValue("@characteristics.agi.value / 2 + 5");
  await expect(formulaInput).toBeDisabled();
  await expect(addRow.locator("td").nth(2).locator("code")).toHaveText("Strength Mod");

  const setRow = rows.nth(1);
  await expect(setRow.locator("td").nth(0)).toHaveText("=");
  await expect(setRow.locator("td").nth(0).locator("span")).toHaveAttribute("aria-label", "Set");

  const actionsCell = addRow.locator("td").nth(3);
  const actionButtons = actionsCell.locator("a.icon-button");
  await expect(actionButtons).toHaveCount(3);
  await expect(actionButtons.nth(0)).toHaveAttribute("aria-label", "Edit Change");
  await expect(actionButtons.nth(1)).toHaveAttribute("aria-label", "Duplicate Change");
  await expect(actionButtons.nth(2)).toHaveAttribute("aria-label", "Delete Change");
  for (const button of await actionButtons.all()) await expect(button).not.toHaveAttribute("data-action");
});

test("Conditional rows display notes as a non-editable textarea-style preview, target, and Edit/Copy/Delete controls", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId, itemId } = await resetFixtures(page, fixtureLane);
  await updateItem(page, actorId, itemId, {
    "system.changes.conditional": [
      {
        target: "strMod",
        value: "While Enraged, raise your Fly Encumbered threshold by 10 until the end of combat.",
        source: { id: "test", name: "Test" },
      },
    ],
  });
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);
  await openTab(sheet, "changes");
  const panel = sheet.locator('.tab[data-tab="changes"].active');
  const row = panel.locator("table.dense-table").nth(1).locator("tbody tr").nth(0);

  const notes = row.locator("td").nth(0).locator("textarea");
  await expect(notes).toHaveValue("While Enraged, raise your Fly Encumbered threshold by 10 until the end of combat.");
  await expect(notes).toBeDisabled();
  await expect(row.locator("td").nth(1).locator("code")).toHaveText("Strength Mod");

  const actionButtons = row.locator("td").nth(2).locator("a.icon-button");
  await expect(actionButtons).toHaveCount(3);
  await expect(actionButtons.nth(0)).toHaveAttribute("aria-label", "Edit Conditional");
  await expect(actionButtons.nth(1)).toHaveAttribute("aria-label", "Duplicate Conditional");
  await expect(actionButtons.nth(2)).toHaveAttribute("aria-label", "Delete Conditional");
});

test("empty Changes and Conditionals tables remain visible with their Add affordances", async ({ foundryPage: page, fixtureLane }) => {
  const { actorId, itemId } = await resetFixtures(page, fixtureLane);
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);
  await openTab(sheet, "changes");
  const panel = sheet.locator('.tab[data-tab="changes"].active');
  const tables = panel.locator("table.dense-table");

  await expect(tables.nth(0).locator("tbody")).toContainText("No Changes recorded yet.");
  await expect(tables.nth(0).locator("thead th").nth(1).locator("a.icon-button")).toBeVisible();
  await expect(tables.nth(1).locator("tbody")).toContainText("No Conditionals recorded yet.");
  await expect(tables.nth(1).locator("thead th").nth(1).locator("a.icon-button")).toBeVisible();
});

test("the Changes tab remains usable, without whole-sheet overflow, at representative Item-sheet widths", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId, itemId } = await resetFixtures(page, fixtureLane);
  await updateItem(page, actorId, itemId, {
    "system.changes.computed": [
      { target: "strMod", mode: "add", formula: "@characteristics.agi.value / 2 + 5", source: { id: "test", name: "Test" } },
    ],
    "system.changes.conditional": [
      { target: "strMod", value: "While Enraged, raise your Fly Encumbered threshold by 10 until the end of combat.", source: { id: "test", name: "Test" } },
    ],
  });
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);
  await openTab(sheet, "changes");

  for (const width of [800, 640, 480]) {
    await resizeSheet(page, sheetId, width);
    const shell = sheet.locator(".dos100-item-shell");
    await expect(shell).toBeVisible();
    const overflow = await shell.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
    await expect(sheet.locator('.tab[data-tab="changes"].active table.dense-table')).toHaveCount(2);
  }
});

