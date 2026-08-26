// Lightweight-tier Effect Item sheet tests. All assertions here are on
// static rendered markup and carry no Foundry dependency. The one test
// that requires a live Foundry instance (grant source resolved from the
// existing grant system via _onCreate flags) lives in
// test/e2e/item-sheet-effect.spec.ts.
import { expect, test } from "@playwright/test";
import { buildEffectContext } from "./support/effect-context.js";
import { renderPage } from "./support/render.js";

const ITEM_SHELL_PARTIALS = [
  "items/shell/description-tab.hbs",
  "items/shell/details-tab.hbs",
  "items/shell/changes-tab.hbs",
  "items/shell/links-tab.hbs",
];

test("the Effect sheet renders the abstract Item shell: editable header, sidebar heading, and Description/Details/Changes/Links navigation", async ({
  page,
}) => {
  const html = renderPage(
    "items/shell/item-shell.hbs",
    buildEffectContext({ name: "[Browser] Effect" }),
    { partials: ITEM_SHELL_PARTIALS },
  );
  await page.setContent(html);

  await expect(page.locator(".dos100-item-portrait")).toHaveAttribute("src", /.+/);
  await expect(page.locator('input[name="name"]')).toHaveValue("[Browser] Effect");

  const sidebar = page.locator(".dos100-item-sidebar");
  await expect(sidebar).toContainText("Effect");

  const tabLabels = await page.locator('[role="tab"][data-group="primary"]').allTextContents();
  expect(tabLabels).toEqual(["Description", "Details", "Changes", "Links"]);
});

test("Active checkbox is unchecked when system.active is false", async ({ page }) => {
  const html = renderPage(
    "items/shell/item-shell.hbs",
    buildEffectContext({ system: { active: false } }),
    { partials: ITEM_SHELL_PARTIALS },
  );
  await page.setContent(html);

  const activeCheckbox = page.locator('input[name="system.active"]');
  await expect(activeCheckbox).not.toBeChecked();
});

test("Active checkbox binds to system.active", async ({ page }) => {
  const html = renderPage(
    "items/shell/item-shell.hbs",
    buildEffectContext({}),
    { partials: ITEM_SHELL_PARTIALS },
  );
  await page.setContent(html);

  await expect(page.locator('input[name="system.active"]')).toBeVisible();
});

test("Pinned checkbox binds to system.actions.pinned", async ({ page }) => {
  const html = renderPage(
    "items/shell/item-shell.hbs",
    buildEffectContext({}),
    { partials: ITEM_SHELL_PARTIALS },
  );
  await page.setContent(html);

  await expect(page.locator('input[name="system.actions.pinned"]')).toBeVisible();
});

test("No Combat Tab control appears in the sidebar", async ({ page }) => {
  const html = renderPage(
    "items/shell/item-shell.hbs",
    buildEffectContext({}),
    { partials: ITEM_SHELL_PARTIALS },
  );
  await page.setContent(html);

  await expect(page.locator('input[name="system.showInCombatTab"]')).toHaveCount(0);
});

test("sidebar Tags render from system.tags", async ({ page }) => {
  const html = renderPage(
    "items/shell/item-shell.hbs",
    buildEffectContext({ system: { tags: ["rage", "combat"] } }),
    { partials: ITEM_SHELL_PARTIALS },
  );
  await page.setContent(html);

  const chips = page.locator(".dos100-item-sidebar .dos100-item-tag");
  await expect(chips).toHaveCount(2);
  await expect(chips.nth(0)).toHaveText("rage");
  await expect(chips.nth(1)).toHaveText("combat");
});

test("grant source displays as 'Name (Type)' beneath the Effect heading when present", async ({
  page,
}) => {
  const html = renderPage(
    "items/shell/item-shell.hbs",
    buildEffectContext({ grantSource: { name: "Test Ability", typeLabel: "Ability" } }),
    { partials: ITEM_SHELL_PARTIALS },
  );
  await page.setContent(html);

  const grantSource = page.locator(".dos100-item-grant-source");
  await expect(grantSource).toBeVisible();
  await expect(grantSource).toHaveText("Test Ability (Ability)");
});

test("no grant source line or placeholder when grantSource is null", async ({ page }) => {
  const html = renderPage(
    "items/shell/item-shell.hbs",
    buildEffectContext({ grantSource: null }),
    { partials: ITEM_SHELL_PARTIALS },
  );
  await page.setContent(html);

  await expect(page.locator(".dos100-item-grant-source")).toHaveCount(0);
});

test("the shell remains usable, without overflow, at representative sheet widths", async ({
  page,
}) => {
  const html = renderPage(
    "items/shell/item-shell.hbs",
    buildEffectContext({ system: { tags: ["rage"] } }),
    { partials: ITEM_SHELL_PARTIALS },
  );
  await page.setContent(html);

  for (const width of [800, 640, 480]) {
    await page.setViewportSize({ width, height: 560 });
    const shell = page.locator(".dos100-item-shell");
    await expect(shell).toBeVisible();
    const overflow = await shell.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  }
});
