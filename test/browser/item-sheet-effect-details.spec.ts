// Browser-tier Effect type-specific Details fields. The shared Details tab
// infrastructure is already covered in item-sheet-details.spec.ts; these tests
// cover only the Effect-specific section.
import { expect, test } from "@playwright/test";
import { buildEffectContext } from "./support/effect-context.js";
import { renderPage } from "./support/render.js";

const ITEM_SHELL_PARTIALS = [
  "items/item-header.hbs",
  "items/shell/description-tab.hbs",
  "items/shell/details-tab.hbs",
  "items/effect-details-fields.hbs",
  "items/shell/changes-tab.hbs",
  "items/shell/links-tab.hbs",
];

function renderDetails(overrides: Parameters<typeof buildEffectContext>[0] = {}) {
  return renderPage(
    "items/shell/item-shell.hbs",
    buildEffectContext(overrides, "details"),
    { partials: ITEM_SHELL_PARTIALS },
  );
}

test("Effect Details uses the shared abstract implementation", async ({ page }) => {
  await page.setContent(renderDetails());

  const detailsPanel = page.locator('.tab[data-group="primary"][data-tab="details"].active');
  await expect(detailsPanel.locator("table.dense-table")).toHaveCount(3);
  await expect(detailsPanel.locator('select[name="system.actions.uses.per"]')).toBeVisible();
});

test("Duration renders formula text input and unit select bound to their schema fields", async ({
  page,
}) => {
  await page.setContent(
    renderDetails({ system: { duration: { formula: "1d6", unit: "minute", expiration: null } } }),
  );

  await expect(page.locator('input[name="system.duration.formula"]')).toHaveValue("1d6");
  await expect(page.locator('select[name="system.duration.unit"]')).toHaveValue("minute");
});

test("End Timing select exposes Start of Turn and End of Turn options", async ({ page }) => {
  await page.setContent(renderDetails());

  const select = page.locator('select[name="system.duration.expiration"]');
  await expect(select).toBeVisible();
  await expect(select.locator('option[value="startOfTurn"]')).toBeAttached();
  await expect(select.locator('option[value="endOfTurn"]')).toBeAttached();
});

test("End Timing selects the blank option when expiration is null", async ({ page }) => {
  await page.setContent(renderDetails({ system: { duration: { formula: "", unit: "round", expiration: null } } }));

  await expect(page.locator('select[name="system.duration.expiration"]')).toHaveValue("");
});

test("End Timing binds to system.duration.expiration", async ({ page }) => {
  await page.setContent(
    renderDetails({ system: { duration: { formula: "", unit: "round", expiration: "startOfTurn" } } }),
  );

  await expect(page.locator('select[name="system.duration.expiration"]')).toHaveValue("startOfTurn");
});

test("Stacking renders a select bound to system.stackingRule", async ({ page }) => {
  await page.setContent(renderDetails({ system: { stackingRule: "extend" } }));

  await expect(page.locator('select[name="system.stackingRule"]')).toHaveValue("extend");
});

test("Effect continues to use the shared Advanced section", async ({ page }) => {
  await page.setContent(renderDetails({ system: { tags: ["rage"], identifier: "rage-effect" } }));

  const advanced = page.locator(".dos100-item-advanced");
  await expect(advanced).toBeVisible();
  await expect(advanced.locator('input[name="system.identifier"]')).toHaveValue("rage-effect");
});
