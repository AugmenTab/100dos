// Lightweight-tier counterparts of the 3 portable tests from
// test/e2e/item-sheet-ability.spec.ts. The other 3 tests in that file
// (checkbox toggle-and-persist, active/rerender, ProseMirror content)
// stay in real Foundry — their assertions are about Foundry's own form
// persistence, Document rerender, and ProseMirror integration, not
// 100DOS's own rendering. See
// .local/analysis-foundry-dependency-classification.md.
import { expect, test } from "@playwright/test";
import { buildAbilityContext } from "./support/ability-context.js";
import { renderPage } from "./support/render.js";

const ITEM_SHELL_PARTIALS = [
  "items/shell/description-tab.hbs",
  "items/shell/changes-tab.hbs",
  "items/shell/links-tab.hbs",
];

test("the Ability sheet renders the abstract Item shell: editable header, sidebar heading, and Description/Details/Changes/Links navigation", async ({
  page,
}) => {
  const html = renderPage(
    "items/shell/item-shell.hbs",
    buildAbilityContext({ name: "[E2E] Ability" }),
    { partials: ITEM_SHELL_PARTIALS },
  );
  await page.setContent(html);

  await expect(page.locator(".dos100-item-portrait")).toHaveAttribute("src", /.+/);
  await expect(page.locator('input[name="name"]')).toHaveValue("[E2E] Ability");

  const sidebar = page.locator(".dos100-item-sidebar");
  await expect(sidebar).toContainText("Ability");

  const tabLabels = await page.locator('[role="tab"][data-group="primary"]').allTextContents();
  expect(tabLabels).toEqual(["Description", "Details", "Changes", "Links"]);
});

test("sidebar Tags render from system.tags", async ({ page }) => {
  const html = renderPage(
    "items/shell/item-shell.hbs",
    buildAbilityContext({ system: { tags: ["combat", "movement"] } }),
    { partials: ITEM_SHELL_PARTIALS },
  );
  await page.setContent(html);

  const chips = page.locator(".dos100-item-tag");
  await expect(chips).toHaveCount(2);
  await expect(chips.nth(0)).toHaveText("combat");
  await expect(chips.nth(1)).toHaveText("movement");
});

test("the shell remains usable, without overflow, at representative sheet widths", async ({ page }) => {
  const html = renderPage(
    "items/shell/item-shell.hbs",
    buildAbilityContext({ system: { tags: ["combat"] } }),
    { partials: ITEM_SHELL_PARTIALS },
  );
  await page.setContent(html);

  // No Foundry ApplicationV2 window exists here to resize — the viewport
  // itself is the containing block .dos100-item-shell's responsive CSS
  // reacts to, so it stands in for the app window's content width.
  for (const width of [640, 480, 360]) {
    await page.setViewportSize({ width, height: 560 });
    const shell = page.locator(".dos100-item-shell");
    await expect(shell).toBeVisible();
    const overflow = await shell.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  }
});
