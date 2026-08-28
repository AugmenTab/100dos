import { expect, test } from "./support/diagnostics.js";
import { resetFixtures } from "./support/fixtures.js";
import { openItemSheet, openTab, updateItem } from "./support/item-sheet.js";
// Despite the name, this only calls setPosition on the given sheetId — no
// Actor/PC-sheet assumptions — so it works for an Item sheet too.
import { resizePcSheet as resizeSheet } from "./support/pc-sheet.js";

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

test("Description renders the rich-text editor bound to system.description; Details tab is navigable and shows Actions, uses, notes, and Advanced sections", async ({
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
  const detailsPanel = sheet.locator('.tab[data-tab="details"].active');
  await expect(detailsPanel.locator("table.dense-table")).toHaveCount(3);
  await expect(detailsPanel.locator('select[name="system.actions.uses.per"]')).toBeVisible();
  await expect(detailsPanel.locator(".dos100-item-advanced")).toBeVisible();
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
  await expect(addChange).toHaveAttribute("data-action", "addChange");

  const addConditional = tables.nth(1).locator("thead th").nth(1).locator("a.icon-button");
  await expect(addConditional).toHaveAttribute("aria-label", "Add Conditional");
  await expect(addConditional).toHaveAttribute("data-action", "addConditional");
});

test("Change rows display mode (as a compact symbol), formula, target, and Edit/Copy/Delete controls", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId, itemId } = await resetFixtures(page, fixtureLane);
  await updateItem(page, actorId, itemId, {
    "system.changes.computed": [
      {
        target: "strModifier",
        mode: "add",
        formula: "@characteristics.agi.value / 2 + 5",
        source: { id: "test", name: "Test" },
      },
      {
        target: "strModifier",
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
  await expect(addRow.locator("td").nth(2).locator("code")).toHaveText("Strength Modifier");

  const setRow = rows.nth(1);
  await expect(setRow.locator("td").nth(0)).toHaveText("=");
  await expect(setRow.locator("td").nth(0).locator("span")).toHaveAttribute("aria-label", "Set");

  const actionsCell = addRow.locator("td").nth(3);
  const actionButtons = actionsCell.locator("a.icon-button");
  await expect(actionButtons).toHaveCount(3);
  await expect(actionButtons.nth(0)).toHaveAttribute("aria-label", "Edit Change");
  await expect(actionButtons.nth(1)).toHaveAttribute("aria-label", "Duplicate Change");
  await expect(actionButtons.nth(2)).toHaveAttribute("aria-label", "Delete Change");
  await expect(actionButtons.nth(0)).toHaveAttribute("data-action", "editChange");
  await expect(actionButtons.nth(1)).toHaveAttribute("data-action", "duplicateChange");
  await expect(actionButtons.nth(2)).toHaveAttribute("data-action", "deleteChange");
});

test("Conditional rows display notes as a non-editable textarea-style preview, target, and Edit/Copy/Delete controls", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId, itemId } = await resetFixtures(page, fixtureLane);
  await updateItem(page, actorId, itemId, {
    "system.changes.conditional": [
      {
        target: "allCharacteristicTests",
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
  await expect(row.locator("td").nth(1).locator("code")).toHaveText("All Characteristic Tests");

  const actionButtons = row.locator("td").nth(2).locator("a.icon-button");
  await expect(actionButtons).toHaveCount(3);
  await expect(actionButtons.nth(0)).toHaveAttribute("aria-label", "Edit Conditional");
  await expect(actionButtons.nth(1)).toHaveAttribute("aria-label", "Duplicate Conditional");
  await expect(actionButtons.nth(2)).toHaveAttribute("aria-label", "Delete Conditional");
  await expect(actionButtons.nth(0)).toHaveAttribute("data-action", "editConditional");
  await expect(actionButtons.nth(1)).toHaveAttribute("data-action", "duplicateConditional");
  await expect(actionButtons.nth(2)).toHaveAttribute("data-action", "deleteConditional");
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

test("Add Action creates a new Action row with default values", async ({ foundryPage: page, fixtureLane }) => {
  const { actorId, itemId } = await resetFixtures(page, fixtureLane);
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);
  await openTab(sheet, "details");
  const panel = sheet.locator('.tab[data-tab="details"].active');
  const addButton = panel.locator('thead a[data-action="addAction"]');
  await addButton.click();
  await expect.poll(async () =>
    Object.keys(
      (await page.evaluate(
        ({ actorId, itemId }) => game.actors.get(actorId)?.items.get(itemId)?.system.actions.items,
        { actorId, itemId },
      )) ?? {},
    ).length,
  ).toBe(1);
  const rows = panel.locator("table.dense-table").first().locator("tbody tr");
  await expect(rows).toHaveCount(1);
  await expect(rows.nth(0).locator("td").nth(0)).toContainText("New Action");
});

test("Duplicate Action creates a copy with (Copy) appended to the name", async ({ foundryPage: page, fixtureLane }) => {
  const { actorId, itemId } = await resetFixtures(page, fixtureLane);
  const actionId = await page.evaluate(() => foundry.utils.randomID());
  await updateItem(page, actorId, itemId, {
    [`system.actions.items.${actionId}`]: {
      id: actionId,
      name: "Slash",
      activation: { type: "full", cost: null },
      uses: { per: "unlimited", value: 0, max: 0, cost: 1, formula: { max: "", cost: "" } },
    },
  });
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);
  await openTab(sheet, "details");
  const panel = sheet.locator('.tab[data-tab="details"].active');
  const dupButton = panel.locator(`a[data-action="duplicateAction"][data-identifier="${actionId}"]`);
  await dupButton.click();
  await expect.poll(async () =>
    Object.keys(
      (await page.evaluate(
        ({ actorId, itemId }) => game.actors.get(actorId)?.items.get(itemId)?.system.actions.items,
        { actorId, itemId },
      )) ?? {},
    ).length,
  ).toBe(2);
  const names: string[] = await page.evaluate(
    ({ actorId, itemId }) =>
      Object.values(game.actors.get(actorId)?.items.get(itemId)?.system.actions.items ?? {}).map((a: unknown) => (a as { name: string }).name),
    { actorId, itemId },
  );
  expect(names).toContain("Slash (Copy)");
});

test("Delete Action removes the row", async ({ foundryPage: page, fixtureLane }) => {
  const { actorId, itemId } = await resetFixtures(page, fixtureLane);
  const actionId = await page.evaluate(() => foundry.utils.randomID());
  await updateItem(page, actorId, itemId, {
    [`system.actions.items.${actionId}`]: {
      id: actionId,
      name: "Slash",
      activation: { type: "full", cost: null },
      uses: { per: "unlimited", value: 0, max: 0, cost: 1, formula: { max: "", cost: "" } },
    },
  });
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);
  await openTab(sheet, "details");
  const panel = sheet.locator('.tab[data-tab="details"].active');
  const delButton = panel.locator(`a[data-action="deleteAction"][data-identifier="${actionId}"]`);
  await delButton.click();
  await expect.poll(async () =>
    Object.keys(
      (await page.evaluate(
        ({ actorId, itemId }) => game.actors.get(actorId)?.items.get(itemId)?.system.actions.items,
        { actorId, itemId },
      )) ?? {},
    ).length,
  ).toBe(0);
});

test("Duplicate Change appends a copy to the computed array", async ({ foundryPage: page, fixtureLane }) => {
  const { actorId, itemId } = await resetFixtures(page, fixtureLane);
  await updateItem(page, actorId, itemId, {
    "system.changes.computed": [
      { target: "strModifier", mode: "add", formula: "5", source: { id: "src", name: "Src" } },
    ],
  });
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);
  await openTab(sheet, "changes");
  const panel = sheet.locator('.tab[data-tab="changes"].active');
  const dupButton = panel.locator('a[data-action="duplicateChange"]').first();
  await dupButton.click();
  await expect.poll(async () =>
    (await page.evaluate(
      ({ actorId, itemId }) => game.actors.get(actorId)?.items.get(itemId)?.system.changes.computed.length,
      { actorId, itemId },
    )),
  ).toBe(2);
});

test("Delete Change removes the entry from the computed array", async ({ foundryPage: page, fixtureLane }) => {
  const { actorId, itemId } = await resetFixtures(page, fixtureLane);
  await updateItem(page, actorId, itemId, {
    "system.changes.computed": [
      { target: "strModifier", mode: "add", formula: "5", source: { id: "src", name: "Src" } },
    ],
  });
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);
  await openTab(sheet, "changes");
  const panel = sheet.locator('.tab[data-tab="changes"].active');
  const delButton = panel.locator('a[data-action="deleteChange"]').first();
  await delButton.click();
  await expect.poll(async () =>
    (await page.evaluate(
      ({ actorId, itemId }) => game.actors.get(actorId)?.items.get(itemId)?.system.changes.computed.length,
      { actorId, itemId },
    )),
  ).toBe(0);
});

test("Duplicate Conditional appends a copy to the conditional array", async ({ foundryPage: page, fixtureLane }) => {
  const { actorId, itemId } = await resetFixtures(page, fixtureLane);
  await updateItem(page, actorId, itemId, {
    "system.changes.conditional": [
      { target: "allCharacteristicTests", value: "Some note.", source: { id: "src", name: "Src" } },
    ],
  });
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);
  await openTab(sheet, "changes");
  const panel = sheet.locator('.tab[data-tab="changes"].active');
  const dupButton = panel.locator('a[data-action="duplicateConditional"]').first();
  await dupButton.click();
  await expect.poll(async () =>
    (await page.evaluate(
      ({ actorId, itemId }) => game.actors.get(actorId)?.items.get(itemId)?.system.changes.conditional.length,
      { actorId, itemId },
    )),
  ).toBe(2);
});

test("Delete Conditional removes the entry from the conditional array", async ({ foundryPage: page, fixtureLane }) => {
  const { actorId, itemId } = await resetFixtures(page, fixtureLane);
  await updateItem(page, actorId, itemId, {
    "system.changes.conditional": [
      { target: "allCharacteristicTests", value: "Some note.", source: { id: "src", name: "Src" } },
    ],
  });
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);
  await openTab(sheet, "changes");
  const panel = sheet.locator('.tab[data-tab="changes"].active');
  const delButton = panel.locator('a[data-action="deleteConditional"]').first();
  await delButton.click();
  await expect.poll(async () =>
    (await page.evaluate(
      ({ actorId, itemId }) => game.actors.get(actorId)?.items.get(itemId)?.system.changes.conditional.length,
      { actorId, itemId },
    )),
  ).toBe(0);
});

test("the Changes tab remains usable, without whole-sheet overflow, at representative Item-sheet widths", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId, itemId } = await resetFixtures(page, fixtureLane);
  await updateItem(page, actorId, itemId, {
    "system.changes.computed": [
      { target: "strModifier", mode: "add", formula: "@characteristics.agi.value / 2 + 5", source: { id: "test", name: "Test" } },
    ],
    "system.changes.conditional": [
      { target: "allCharacteristicTests", value: "While Enraged, raise your Fly Encumbered threshold by 10 until the end of combat.", source: { id: "test", name: "Test" } },
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

test("Add Change opens the editor dialog; saving appends a new row with the entered values", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId, itemId } = await resetFixtures(page, fixtureLane);
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);
  await openTab(sheet, "changes");
  const panel = sheet.locator('.tab[data-tab="changes"].active');

  await panel.locator('thead a[data-action="addChange"]').click();
  const dialog = page.locator(".change-editor-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('select[name="mode"]')).toBeVisible();
  await expect(dialog.locator('input[name="formula"]')).toBeVisible();

  await dialog.locator('select[name="mode"]').selectOption("set");
  await dialog.locator('input[name="formula"]').fill("99");
  await dialog.locator("button[data-action='selectTarget']").click();
  const picker = page.locator(".change-target-picker-dialog");
  await picker.locator('a[data-action="pickTarget"]').first().click();
  await expect(picker).not.toBeVisible();
  await dialog.locator("button[data-action='saveAndClose']").click();
  await expect(dialog).not.toBeVisible();

  await expect.poll(async () =>
    page.evaluate(
      ({ actorId, itemId }) => game.actors.get(actorId)?.items.get(itemId)?.system.changes.computed.length,
      { actorId, itemId },
    ),
  ).toBe(1);
  const saved = await page.evaluate(
    ({ actorId, itemId }) => {
      const changes = game.actors.get(actorId)?.items.get(itemId)?.system.changes.computed as { mode: string; formula: string }[] | undefined;
      return changes?.[0];
    },
    { actorId, itemId },
  );
  expect(saved?.mode).toBe("set");
  expect(saved?.formula).toBe("99");
});

test("Add Change dialog Cancel leaves the computed array unchanged", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId, itemId } = await resetFixtures(page, fixtureLane);
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);
  await openTab(sheet, "changes");
  const panel = sheet.locator('.tab[data-tab="changes"].active');

  await panel.locator('thead a[data-action="addChange"]').click();
  const dialog = page.locator(".change-editor-dialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("button[data-action='cancelDialog']").click();
  await expect(dialog).not.toBeVisible();

  const count = await page.evaluate(
    ({ actorId, itemId }) => game.actors.get(actorId)?.items.get(itemId)?.system.changes.computed.length,
    { actorId, itemId },
  );
  expect(count).toBe(0);
});

test("Edit Change opens the editor pre-filled; saving replaces the row with updated values", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId, itemId } = await resetFixtures(page, fixtureLane);
  await updateItem(page, actorId, itemId, {
    "system.changes.computed": [
      { target: "strModifier", mode: "add", formula: "5", source: { id: "src", name: "Src" } },
    ],
  });
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);
  await openTab(sheet, "changes");
  const panel = sheet.locator('.tab[data-tab="changes"].active');

  await panel.locator('a[data-action="editChange"]').first().click();
  const dialog = page.locator(".change-editor-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('select[name="mode"]')).toHaveValue("add");
  await expect(dialog.locator('input[name="formula"]')).toHaveValue("5");

  await dialog.locator('input[name="formula"]').fill("10");
  await dialog.locator("button[data-action='saveAndClose']").click();
  await expect(dialog).not.toBeVisible();

  await expect.poll(async () =>
    page.evaluate(
      ({ actorId, itemId }) => {
        const changes = game.actors.get(actorId)?.items.get(itemId)?.system.changes.computed as { formula: string }[] | undefined;
        return changes?.[0]?.formula;
      },
      { actorId, itemId },
    ),
  ).toBe("10");
});

test("Target picker opens from the Change editor; selecting a target updates the editor display", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId, itemId } = await resetFixtures(page, fixtureLane);
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);
  await openTab(sheet, "changes");
  const panel = sheet.locator('.tab[data-tab="changes"].active');

  await panel.locator('thead a[data-action="addChange"]').click();
  const editor = page.locator(".change-editor-dialog");
  await expect(editor).toBeVisible();

  await editor.locator("button[data-action='selectTarget']").click();
  const picker = page.locator(".change-target-picker-dialog");
  await expect(picker).toBeVisible();
  await picker.locator('a[data-action="pickTarget"]').first().click();
  await expect(picker).not.toBeVisible();
  await expect(editor.locator('button[data-action="selectTarget"]')).toHaveText("All Characteristic Tests");

  await editor.locator("button[data-action='cancelDialog']").click();
  await expect(editor).not.toBeVisible();
});

test("Add Conditional opens the editor dialog; saving appends a new row with the entered notes", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId, itemId } = await resetFixtures(page, fixtureLane);
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);
  await openTab(sheet, "changes");
  const panel = sheet.locator('.tab[data-tab="changes"].active');

  await panel.locator('thead a[data-action="addConditional"]').click();
  const dialog = page.locator(".change-editor-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('textarea[name="value"]')).toBeVisible();

  await dialog.locator('textarea[name="value"]').fill("Bonus applies while raging.");
  await dialog.locator("button[data-action='selectTarget']").click();
  const picker = page.locator(".conditional-note-target-picker-dialog");
  await picker.locator('a[data-action="pickTarget"]').first().click();
  await expect(picker).not.toBeVisible();
  await dialog.locator("button[data-action='saveAndClose']").click();
  await expect(dialog).not.toBeVisible();

  await expect.poll(async () =>
    page.evaluate(
      ({ actorId, itemId }) => game.actors.get(actorId)?.items.get(itemId)?.system.changes.conditional.length,
      { actorId, itemId },
    ),
  ).toBe(1);
  const saved = await page.evaluate(
    ({ actorId, itemId }) => {
      const conds = game.actors.get(actorId)?.items.get(itemId)?.system.changes.conditional as { value: string }[] | undefined;
      return conds?.[0]?.value;
    },
    { actorId, itemId },
  );
  expect(saved).toBe("Bonus applies while raging.");
});

test("Edit Conditional opens the editor pre-filled; saving replaces the row with updated notes", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId, itemId } = await resetFixtures(page, fixtureLane);
  await updateItem(page, actorId, itemId, {
    "system.changes.conditional": [
      { target: "allCharacteristicTests", value: "Original note.", source: { id: "src", name: "Src" } },
    ],
  });
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);
  await openTab(sheet, "changes");
  const panel = sheet.locator('.tab[data-tab="changes"].active');

  await panel.locator('a[data-action="editConditional"]').first().click();
  const dialog = page.locator(".change-editor-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('textarea[name="value"]')).toHaveValue("Original note.");

  await dialog.locator('textarea[name="value"]').fill("Updated note.");
  await dialog.locator("button[data-action='saveAndClose']").click();
  await expect(dialog).not.toBeVisible();

  await expect.poll(async () =>
    page.evaluate(
      ({ actorId, itemId }) => {
        const conds = game.actors.get(actorId)?.items.get(itemId)?.system.changes.conditional as { value: string }[] | undefined;
        return conds?.[0]?.value;
      },
      { actorId, itemId },
    ),
  ).toBe("Updated note.");
});

test("Target picker switches categories; selecting a target in a non-default category persists correctly", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId, itemId } = await resetFixtures(page, fixtureLane);
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);
  await openTab(sheet, "changes");

  await sheet.locator('thead a[data-action="addChange"]').click();
  const editor = page.locator(".change-editor-dialog");
  const picker = page.locator(".change-target-picker-dialog");

  await editor.locator("button[data-action='selectTarget']").click();
  await expect(picker).toBeVisible();

  // Default category (Characteristic Tests) is active
  const navButtons = picker.locator("nav button");
  await expect(navButtons.filter({ hasText: "Characteristic Tests" })).toHaveClass(/active/);

  // Switch to Health
  await navButtons.filter({ hasText: "Health" }).click();
  await expect(navButtons.filter({ hasText: "Health" })).toHaveClass(/active/);
  await expect(navButtons.filter({ hasText: "Characteristic Tests" })).not.toHaveClass(/active/);

  // Select "Wounds"
  await picker.locator('a[data-action="pickTarget"][data-target="wounds"]').click();
  await expect(picker).not.toBeVisible();
  await expect(editor.locator('button[data-action="selectTarget"]')).toHaveText("Wounds");

  await editor.locator("button[data-action='saveAndClose']").click();
  await expect(editor).not.toBeVisible();

  await expect.poll(async () =>
    page.evaluate(
      ({ actorId, itemId }) => {
        const changes = game.actors.get(actorId)?.items.get(itemId)?.system.changes.computed as { target: string }[] | undefined;
        return changes?.[0]?.target;
      },
      { actorId, itemId },
    ),
  ).toBe("wounds");
});

test("Target picker shows actor-specific skills and persists a dynamic skill target", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId, itemId } = await resetFixtures(page, fixtureLane);

  // Seed a skill onto the actor
  await page.evaluate(
    async ({ actorId }) => {
      const actor = game.actors.get(actorId);
      if (!actor) throw new Error("Actor not found");
      await actor.update({
        "system.skills.medicineHuman": {
          name: "Human Medicine",
          difficulty: "advanced",
          type: [],
          training: "trained",
          characteristic: "int",
          characteristics: ["int"],
          value: 0,
          pinned: false,
          description: "",
          contributions: {},
        },
      });
    },
    { actorId },
  );

  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);
  await openTab(sheet, "changes");

  await sheet.locator('thead a[data-action="addChange"]').click();
  const editor = page.locator(".change-editor-dialog");
  const picker = page.locator(".change-target-picker-dialog");

  await editor.locator("button[data-action='selectTarget']").click();
  await expect(picker).toBeVisible();

  // Navigate to Skills category
  await picker.locator("nav button").filter({ hasText: "Skills" }).click();

  // The seeded skill should appear
  const skillTarget = picker.locator('a[data-action="pickTarget"][data-target="skill:medicineHuman"]');
  await expect(skillTarget).toBeVisible();
  await expect(skillTarget).toHaveText("Human Medicine");
  await skillTarget.click();

  await expect(picker).not.toBeVisible();
  await expect(editor.locator('button[data-action="selectTarget"]')).toHaveText("Human Medicine");

  await editor.locator("button[data-action='saveAndClose']").click();
  await expect(editor).not.toBeVisible();

  await expect.poll(async () =>
    page.evaluate(
      ({ actorId, itemId }) => {
        const changes = game.actors.get(actorId)?.items.get(itemId)?.system.changes.computed as { target: string }[] | undefined;
        return changes?.[0]?.target;
      },
      { actorId, itemId },
    ),
  ).toBe("skill:medicineHuman");
});

test("Target picker shows actor-specific DR locations and persists a dynamic DR target", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId, itemId } = await resetFixtures(page, fixtureLane);

  // Seed a DR location onto the actor
  await page.evaluate(
    async ({ actorId }) => {
      const actor = game.actors.get(actorId);
      if (!actor) throw new Error("Actor not found");
      await actor.update({
        "system.dr.head1": {
          type: "head",
          label: "Head 1",
          placement: "none",
          order: 0,
          destroyed: false,
          value: 0,
          contributions: {},
        },
      });
    },
    { actorId },
  );

  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);
  await openTab(sheet, "changes");

  await sheet.locator('thead a[data-action="addChange"]').click();
  const editor = page.locator(".change-editor-dialog");
  const picker = page.locator(".change-target-picker-dialog");

  await editor.locator("button[data-action='selectTarget']").click();
  await expect(picker).toBeVisible();

  // Navigate to Defense category
  await picker.locator("nav button").filter({ hasText: "Defense" }).click();

  // The seeded DR location should appear
  const drTarget = picker.locator('a[data-action="pickTarget"][data-target="drLocation:head1"]');
  await expect(drTarget).toBeVisible();
  await expect(drTarget).toHaveText("Head 1 Damage Resistance");
  await drTarget.click();

  await expect(picker).not.toBeVisible();
  await expect(editor.locator('button[data-action="selectTarget"]')).toHaveText("Head 1 Damage Resistance");

  await editor.locator("button[data-action='saveAndClose']").click();
  await expect(editor).not.toBeVisible();

  await expect.poll(async () =>
    page.evaluate(
      ({ actorId, itemId }) => {
        const changes = game.actors.get(actorId)?.items.get(itemId)?.system.changes.computed as { target: string }[] | undefined;
        return changes?.[0]?.target;
      },
      { actorId, itemId },
    ),
  ).toBe("drLocation:head1");
});

test("Conditional Note target picker opens; switching category and selecting a static target persists correctly", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId, itemId } = await resetFixtures(page, fixtureLane);
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);
  await openTab(sheet, "changes");

  await sheet.locator('thead a[data-action="addConditional"]').click();
  const editor = page.locator(".change-editor-dialog");
  const picker = page.locator(".conditional-note-target-picker-dialog");

  await editor.locator("button[data-action='selectTarget']").click();
  await expect(picker).toBeVisible();

  // Default category is active
  const navButtons = picker.locator("nav button");
  await expect(navButtons.filter({ hasText: "Characteristic Tests" })).toHaveClass(/active/);

  // Switch to Defense
  await navButtons.filter({ hasText: "Defense" }).click();
  await expect(navButtons.filter({ hasText: "Defense" })).toHaveClass(/active/);

  // Select "Energy Shields"
  await picker.locator('a[data-action="pickTarget"][data-target="energyShields"]').click();
  await expect(picker).not.toBeVisible();
  await expect(editor.locator('button[data-action="selectTarget"]')).toHaveText("Energy Shields");

  await editor.locator("button[data-action='saveAndClose']").click();
  await expect(editor).not.toBeVisible();

  await expect.poll(async () =>
    page.evaluate(
      ({ actorId, itemId }) => {
        const conds = game.actors.get(actorId)?.items.get(itemId)?.system.changes.conditional as { target: string }[] | undefined;
        return conds?.[0]?.target;
      },
      { actorId, itemId },
    ),
  ).toBe("energyShields");
});

test("Conditional Note target picker shows actor-specific skills and persists a dynamic skill target", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId, itemId } = await resetFixtures(page, fixtureLane);

  await page.evaluate(
    async ({ actorId }) => {
      const actor = game.actors.get(actorId);
      if (!actor) throw new Error("Actor not found");
      await actor.update({
        "system.skills.smallArms": {
          name: "Small Arms",
          difficulty: "basic",
          type: [],
          training: "untrained",
          characteristic: "wfr",
          characteristics: ["wfr"],
          value: 0,
          pinned: false,
          description: "",
          contributions: {},
        },
      });
    },
    { actorId },
  );

  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);
  await openTab(sheet, "changes");

  await sheet.locator('thead a[data-action="addConditional"]').click();
  const editor = page.locator(".change-editor-dialog");
  const picker = page.locator(".conditional-note-target-picker-dialog");

  await editor.locator("button[data-action='selectTarget']").click();
  await expect(picker).toBeVisible();

  await picker.locator("nav button").filter({ hasText: "Skills" }).click();

  const skillTarget = picker.locator('a[data-action="pickTarget"][data-target="skill:smallArms"]');
  await expect(skillTarget).toBeVisible();
  await expect(skillTarget).toHaveText("Small Arms");
  await skillTarget.click();

  await expect(picker).not.toBeVisible();
  await expect(editor.locator('button[data-action="selectTarget"]')).toHaveText("Small Arms");

  await editor.locator("button[data-action='saveAndClose']").click();
  await expect(editor).not.toBeVisible();

  await expect.poll(async () =>
    page.evaluate(
      ({ actorId, itemId }) => {
        const conds = game.actors.get(actorId)?.items.get(itemId)?.system.changes.conditional as { target: string }[] | undefined;
        return conds?.[0]?.target;
      },
      { actorId, itemId },
    ),
  ).toBe("skill:smallArms");
});

