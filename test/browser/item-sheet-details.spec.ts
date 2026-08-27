// Lightweight-tier Details tab tests. All assertions are on static rendered
// markup. The Details tab is shared infrastructure: tested once here via the
// Ability context (same template path as Trait and Effect).
import { expect, test } from "@playwright/test";
import { buildAbilityContext } from "./support/ability-context.js";
import { renderPage } from "./support/render.js";

const ITEM_SHELL_PARTIALS = [
  "items/shell/description-tab.hbs",
  "items/shell/details-tab.hbs",
  "items/ability-details-fields.hbs",
  "items/shell/changes-tab.hbs",
  "items/shell/links-tab.hbs",
];

function renderDetails(overrides: Parameters<typeof buildAbilityContext>[0] = {}) {
  return renderPage(
    "items/shell/item-shell.hbs",
    buildAbilityContext(overrides, "details"),
    { partials: ITEM_SHELL_PARTIALS },
  );
}

test("Actions table has exactly one header row with Add control", async ({ page }) => {
  await page.setContent(renderDetails());

  const detailsPanel = page.locator('.tab[data-group="primary"][data-tab="details"].active');
  const actionsTable = detailsPanel.locator("table.dense-table").nth(0);
  await expect(actionsTable.locator("thead tr")).toHaveCount(1);
  const addBtn = actionsTable.locator("thead .icon-button");
  await expect(addBtn).toHaveCount(1);
  await expect(addBtn).toHaveAttribute("aria-label", "Add Action");
});

test("Action rows show name, Uses, and Edit/Copy/Delete controls", async ({ page }) => {
  await page.setContent(
    renderDetails({
      system: {
        actions: {
          items: {
            a1: { id: "a1", name: "Frenzy", uses: { per: "encounter", value: 1, max: 3 } },
          },
        },
      },
    }),
  );

  const detailsPanel = page.locator('.tab[data-group="primary"][data-tab="details"].active');
  const row = detailsPanel.locator("table.dense-table").nth(0).locator("tbody tr").nth(0);
  await expect(row.locator("td").nth(0)).toContainText("Frenzy");
  await expect(row.locator("td").nth(1)).toContainText("1 / 3");
  const controls = row.locator("td").nth(2).locator(".icon-button");
  await expect(controls).toHaveCount(3);
  await expect(controls.nth(0)).toHaveAttribute("aria-label", "Edit action");
  await expect(controls.nth(1)).toHaveAttribute("aria-label", "Duplicate action");
  await expect(controls.nth(2)).toHaveAttribute("aria-label", "Delete action");
  await expect(controls.nth(0)).not.toHaveAttribute("data-action");
  await expect(controls.nth(1)).toHaveAttribute("data-action", "duplicateAction");
  await expect(controls.nth(2)).toHaveAttribute("data-action", "deleteAction");
});

test("empty Actions table renders empty state", async ({ page }) => {
  await page.setContent(renderDetails({ system: { actions: { items: {} } } }));

  const detailsPanel = page.locator('.tab[data-group="primary"][data-tab="details"].active');
  const actionsTable = detailsPanel.locator("table.dense-table").nth(0);
  await expect(actionsTable.locator("tbody")).toContainText("No Actions recorded yet.");
});

test("unlimited uses shows only the period select, no value/max/formula fields", async ({
  page,
}) => {
  await page.setContent(
    renderDetails({
      system: { actions: { uses: { per: "unlimited", value: 0, max: 0, formula: { max: "" } } } },
    }),
  );

  const detailsPanel = page.locator('.tab[data-group="primary"][data-tab="details"].active');
  await expect(detailsPanel.locator('select[name="system.actions.uses.per"]')).toBeVisible();
  await expect(detailsPanel.locator('input[name="system.actions.uses.value"]')).toHaveCount(0);
  await expect(detailsPanel.locator(".dos100-uses-max")).toHaveCount(0);
  await expect(detailsPanel.locator('input[name="system.actions.uses.formula.max"]')).toHaveCount(0);
});

test("finite uses shows value, max, period select, and formula field", async ({ page }) => {
  await page.setContent(
    renderDetails({
      system: { actions: { uses: { per: "encounter", value: 2, max: 3, formula: { max: "@str / 2" } } } },
    }),
  );

  const detailsPanel = page.locator('.tab[data-group="primary"][data-tab="details"].active');
  await expect(detailsPanel.locator('input[name="system.actions.uses.value"]')).toHaveValue("2");
  await expect(detailsPanel.locator(".dos100-uses-max")).toHaveText("3");
  await expect(detailsPanel.locator('select[name="system.actions.uses.per"]')).toBeVisible();
  await expect(detailsPanel.locator('input[name="system.actions.uses.formula.max"]')).toHaveValue("@str / 2");
});

test("Effect Notes table is present with Add button and empty state when empty", async ({
  page,
}) => {
  await page.setContent(renderDetails({ system: { actions: { notes: { effectNotes: [] } } } }));

  const detailsPanel = page.locator('.tab[data-group="primary"][data-tab="details"].active');
  const notesTable = detailsPanel.locator("table.dense-table").nth(1);
  const addBtn = notesTable.locator("thead .icon-button");
  await expect(addBtn).toHaveCount(1);
  await expect(addBtn).toHaveAttribute("aria-label", "Add Effect Note");
  await expect(notesTable.locator("tbody")).toContainText("No Effect Notes recorded yet.");
});

test("Effect Notes rows render inline text inputs with Delete controls", async ({ page }) => {
  await page.setContent(
    renderDetails({ system: { actions: { notes: { effectNotes: ["First note", "Second note"] } } } }),
  );

  const detailsPanel = page.locator('.tab[data-group="primary"][data-tab="details"].active');
  const notesTable = detailsPanel.locator("table.dense-table").nth(1);
  const rows = notesTable.locator("tbody tr");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0).locator('input[type="text"]')).toHaveValue("First note");
  const deleteBtn = rows.nth(0).locator(".icon-button");
  await expect(deleteBtn).toHaveCount(1);
  await expect(deleteBtn).toHaveAttribute("aria-label", "Delete Effect Note");
  await expect(deleteBtn).toHaveAttribute("data-action", "deleteEffectNote");
});

test("Footnotes table is present with Add button and empty state when empty", async ({ page }) => {
  await page.setContent(renderDetails({ system: { actions: { notes: { footnotes: [] } } } }));

  const detailsPanel = page.locator('.tab[data-group="primary"][data-tab="details"].active');
  const footnotesTable = detailsPanel.locator("table.dense-table").nth(2);
  const addBtn = footnotesTable.locator("thead .icon-button");
  await expect(addBtn).toHaveCount(1);
  await expect(addBtn).toHaveAttribute("aria-label", "Add Footnote");
  await expect(footnotesTable.locator("tbody")).toContainText("No Footnotes recorded yet.");
});

test("Advanced section renders Tags chips and Identifier input", async ({ page }) => {
  await page.setContent(
    renderDetails({ system: { tags: ["combat", "mythic"], identifier: "rage" } }),
  );

  const advanced = page.locator(".dos100-item-advanced");
  await expect(advanced).toBeVisible();

  const chips = advanced.locator(".dos100-item-tag");
  await expect(chips).toHaveCount(2);
  await expect(chips.nth(0)).toHaveText("combat");
  await expect(chips.nth(1)).toHaveText("mythic");

  const identifierInput = advanced.locator('input[name="system.identifier"]');
  await expect(identifierInput).toHaveValue("rage");
});

test("Tags Edit button has editTags data-action", async ({ page }) => {
  await page.setContent(renderDetails({ system: { tags: ["combat"] } }));

  const editBtn = page.locator('.dos100-item-advanced .icon-button[aria-label="Edit tags"]');
  await expect(editBtn).toBeVisible();
  await expect(editBtn).toHaveAttribute("data-action", "editTags");
});

test("Details tab remains usable, without overflow, at representative sheet widths", async ({
  page,
}) => {
  await page.setContent(
    renderDetails({
      system: {
        actions: {
          items: { a1: { id: "a1", name: "Frenzy", uses: { per: "encounter", value: 1, max: 3 } } },
          uses: { per: "encounter", value: 1, max: 3, formula: { max: "" } },
          notes: { effectNotes: ["A note"], footnotes: [] },
        },
        tags: ["combat"],
        identifier: "rage",
      },
    }),
  );

  for (const width of [800, 640, 480]) {
    await page.setViewportSize({ width, height: 560 });
    const shell = page.locator(".dos100-item-shell");
    await expect(shell).toBeVisible();
    const overflow = await shell.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  }
});
