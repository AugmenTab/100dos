// Browser-tier Ability type-specific Details fields. The shared Details tab
// infrastructure is already covered in item-sheet-details.spec.ts; these tests
// cover only the Ability-specific section.
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

test("Ability Details uses the shared abstract implementation", async ({ page }) => {
  await page.setContent(renderDetails());

  const detailsPanel = page.locator('.tab[data-group="primary"][data-tab="details"].active');
  await expect(detailsPanel.locator("table.dense-table")).toHaveCount(3);
  await expect(detailsPanel.locator('select[name="system.actions.uses.per"]')).toBeVisible();
});

test("XP Cost renders as a numeric input bound to system.xpCost", async ({ page }) => {
  await page.setContent(renderDetails({ system: { xpCost: 5 } }));

  const detailsPanel = page.locator('.tab[data-group="primary"][data-tab="details"].active');
  const input = detailsPanel.locator('input[name="system.xpCost"]');
  await expect(input).toBeVisible();
  await expect(input).toHaveAttribute("type", "number");
  await expect(input).toHaveValue("5");
});

test("XP Cost uses integer step attribute", async ({ page }) => {
  await page.setContent(renderDetails());

  await expect(page.locator('input[name="system.xpCost"]')).toHaveAttribute("step", "1");
});

test("Prerequisites renders as a text input bound to system.prerequisites", async ({ page }) => {
  await page.setContent(renderDetails({ system: { prerequisites: "Must know Brawl" } }));

  const detailsPanel = page.locator('.tab[data-group="primary"][data-tab="details"].active');
  await expect(detailsPanel.locator('input[name="system.prerequisites"]')).toHaveValue("Must know Brawl");
});

test("Summary renders as a text input bound to system.summary", async ({ page }) => {
  await page.setContent(renderDetails({ system: { summary: "Quick summary" } }));

  const detailsPanel = page.locator('.tab[data-group="primary"][data-tab="details"].active');
  await expect(detailsPanel.locator('input[name="system.summary"]')).toHaveValue("Quick summary");
});

test("Ability continues to use the shared Advanced section", async ({ page }) => {
  await page.setContent(renderDetails({ system: { tags: ["combat"], identifier: "rage" } }));

  const advanced = page.locator(".dos100-item-advanced");
  await expect(advanced).toBeVisible();
  await expect(advanced.locator('input[name="system.identifier"]')).toHaveValue("rage");
});
