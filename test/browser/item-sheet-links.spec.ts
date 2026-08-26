// Lightweight-tier Links tab tests. All assertions here are on static
// rendered markup — sub-tab structure, notices, table headers, empty
// states, and overflow — and carry no Foundry dependency. The one test
// that requires a live Foundry instance (grant system resolving real
// embedded child/supplement items via _onCreate) lives in
// test/e2e/item-sheet-links.spec.ts.
import { expect, test } from "@playwright/test";
import { buildAbilityContext } from "./support/ability-context.js";
import { renderPage } from "./support/render.js";

const ITEM_SHELL_PARTIALS = [
  "items/shell/description-tab.hbs",
  "items/shell/changes-tab.hbs",
  "items/shell/links-tab.hbs",
];

test("Links contains Children and Supplements sub-tabs", async ({ page }) => {
  const html = renderPage(
    "items/shell/item-shell.hbs",
    buildAbilityContext({}, "links"),
    { partials: ITEM_SHELL_PARTIALS },
  );
  await page.setContent(html);

  const panel = page.locator('.tab[data-group="primary"][data-tab="links"].active');
  const subTabLabels = await panel.locator('[role="tab"][data-group="links"]').allTextContents();
  expect(subTabLabels).toEqual(["Children", "Supplements"]);
});

test("Children sub-tab displays its explanatory notice", async ({ page }) => {
  const html = renderPage(
    "items/shell/item-shell.hbs",
    buildAbilityContext({}, "links", "children"),
    { partials: ITEM_SHELL_PARTIALS },
  );
  await page.setContent(html);

  const childrenPanel = page.locator('.tab[data-group="links"][data-tab="children"].active');
  await expect(childrenPanel).toContainText(
    "Child items inherit this item's Active state and are deleted when this item is deleted.",
  );
});

test("Supplements sub-tab displays its explanatory notice", async ({ page }) => {
  const html = renderPage(
    "items/shell/item-shell.hbs",
    buildAbilityContext({}, "links", "supplements"),
    { partials: ITEM_SHELL_PARTIALS },
  );
  await page.setContent(html);

  const supplementsPanel = page.locator('.tab[data-group="links"][data-tab="supplements"].active');
  await expect(supplementsPanel).toContainText(
    "Supplement items are granted alongside this item and are independent once granted.",
  );
});

test("empty Children and Supplements tables remain visible with Item header spanning both columns", async ({ page }) => {
  const html = renderPage(
    "items/shell/item-shell.hbs",
    buildAbilityContext({ childItems: [], supplementItems: [] }, "links", "children"),
    { partials: ITEM_SHELL_PARTIALS },
  );
  await page.setContent(html);

  const childrenPanel = page.locator('.tab[data-group="links"][data-tab="children"].active');
  const childrenTable = childrenPanel.locator("table.dense-table");
  await expect(childrenTable.locator("thead th").nth(0)).toHaveText("Item");
  await expect(childrenTable.locator("thead th").nth(0)).toHaveAttribute("colspan", "2");
  await expect(childrenTable.locator("thead tr")).toHaveCount(1);
  await expect(childrenTable.locator("tbody")).toContainText("No child items.");
});

test("rows display Item image, name, and Edit/Delete controls when childItems and supplementItems are supplied", async ({
  page,
}) => {
  const html = renderPage(
    "items/shell/item-shell.hbs",
    buildAbilityContext(
      {
        childItems: [{ id: "c1", name: "Child One", img: "icons/svg/item-bag.svg" }],
        supplementItems: [{ id: "s1", name: "Supplement One", img: "icons/svg/item-bag.svg" }],
      },
      "links",
      "children",
    ),
    { partials: ITEM_SHELL_PARTIALS },
  );
  await page.setContent(html);

  const childrenPanel = page.locator('.tab[data-group="links"][data-tab="children"].active');
  const childRow = childrenPanel.locator("table.dense-table tbody tr").nth(0);
  await expect(childRow.locator("td").nth(0).locator("img")).toHaveAttribute("src", /.+/);
  await expect(childRow.locator("td").nth(0)).toContainText("Child One");
  const childButtons = childRow.locator("td").nth(1).locator("a.icon-button");
  await expect(childButtons).toHaveCount(2);
  await expect(childButtons.nth(0)).toHaveAttribute("aria-label", "Edit child item");
  await expect(childButtons.nth(1)).toHaveAttribute("aria-label", "Delete child item");
  for (const btn of await childButtons.all()) await expect(btn).not.toHaveAttribute("data-action");
});

test("Links tab remains usable, without overflow, at representative sheet widths", async ({ page }) => {
  const html = renderPage(
    "items/shell/item-shell.hbs",
    buildAbilityContext({}, "links"),
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
