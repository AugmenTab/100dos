// Browser-tier Action sheet tests. Only static rendering assertions live
// here — click-to-open, tab switching, and window close behavior require
// Foundry's ApplicationV2 runtime and stay in test/e2e/item-sheet-action.spec.ts.
import { expect, test } from "@playwright/test";
import { buildActionContext } from "./support/action-context.js";
import { renderPage } from "./support/render.js";

const ACTION_SHELL_PARTIALS = ["items/item-header.hbs"];

function renderSheet(overrides: Parameters<typeof buildActionContext>[0] = {}) {
  return renderPage(
    "items/action/action-shell.hbs",
    buildActionContext(overrides),
    { partials: ACTION_SHELL_PARTIALS },
  );
}

test("Action sheet renders exactly three tabs: Description, Usage, Action", async ({ page }) => {
  await page.setContent(renderSheet());

  const tabLabels = await page.locator('[role="tab"][data-group="primary"]').allTextContents();
  expect(tabLabels).toEqual(["Description", "Usage", "Action"]);
});

test("Conditional Modifiers and Miscellaneous tabs are not present", async ({ page }) => {
  await page.setContent(renderSheet());

  const tabLabels = await page.locator('[role="tab"][data-group="primary"]').allTextContents();
  expect(tabLabels).not.toContain("Conditional Modifiers");
  expect(tabLabels).not.toContain("Miscellaneous");
});

test("Each tab controls exactly one panel, and only the active tab's panel is active", async ({ page }) => {
  await page.setContent(renderSheet());

  const panels = page.locator('.tab[data-group="primary"][role="tabpanel"]');
  await expect(panels).toHaveCount(3);

  for (const tabId of ["description", "usage", "action"]) {
    const tab = page.locator(`[role="tab"][data-group="primary"][data-tab="${tabId}"]`);
    const panel = page.locator(`.tab[data-group="primary"][data-tab="${tabId}"]`);
    await expect(panel).toHaveCount(1);
    await expect(panel).toHaveAttribute("id", (await tab.getAttribute("aria-controls"))!);
    await expect(panel).toHaveAttribute("aria-labelledby", (await tab.getAttribute("id"))!);
  }

  await expect(page.locator('.tab[data-group="primary"].active')).toHaveAttribute("data-tab", "description");
});
