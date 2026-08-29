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

test("Action sheet renders exactly four tabs: Description, Usage, Action, Miscellaneous", async ({ page }) => {
  await page.setContent(renderSheet());

  const tabLabels = await page.locator('[role="tab"][data-group="primary"]').allTextContents();
  expect(tabLabels).toEqual(["Description", "Usage", "Action", "Miscellaneous"]);
});

test("Conditional Modifiers tab is not present", async ({ page }) => {
  await page.setContent(renderSheet());

  const tabLabels = await page.locator('[role="tab"][data-group="primary"]').allTextContents();
  expect(tabLabels).not.toContain("Conditional Modifiers");
});

test("Each tab panel displays its heading and the placeholder text", async ({ page }) => {
  await page.setContent(renderSheet());

  const panels: Array<[string, string]> = [
    ["description", "Description"],
    ["usage", "Usage"],
    ["action", "Action"],
    ["miscellaneous", "Miscellaneous"],
  ];

  for (const [tabId, heading] of panels) {
    const panel = page.locator(`.tab[data-group="primary"][data-tab="${tabId}"]`);
    await expect(panel.locator("h1")).toHaveText(heading);
    await expect(panel).toContainText("This feature is not yet implemented.");
  }
});
