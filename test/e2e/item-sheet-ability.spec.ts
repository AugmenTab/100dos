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

test("the Ability sheet renders the abstract Item shell: editable header, sidebar heading, and Description/Details/Changes navigation", async ({
  foundryPage: page,
}) => {
  const { actorId, itemId } = await resetFixtures(page);
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);

  await expect(sheet.locator(".dos100-item-portrait")).toHaveAttribute("src", /.+/);
  await expect(sheet.locator('input[name="name"]')).toHaveValue("[E2E] Ability");

  const sidebar = sheet.locator(".dos100-item-sidebar");
  await expect(sidebar).toContainText("Ability");

  const tabLabels = await sheet.locator('[role="tab"][data-group="primary"]').allTextContents();
  expect(tabLabels).toEqual(["Description", "Details", "Changes"]);
});

test("sidebar checkboxes are ordered Disabled, Pinned, Combat Tab and bind to their schema fields", async ({ foundryPage: page }) => {
  const { actorId, itemId } = await resetFixtures(page);
  await updateItem(page, actorId, itemId, {
    "system.disabled": true,
    "system.actions.pinned": true,
    "system.showInCombatTab": true,
  });
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);

  const checkboxes = sheet.locator(".dos100-item-checkbox input[type=checkbox]");
  await expect(checkboxes).toHaveCount(3);
  await expect(checkboxes.nth(0)).toHaveAttribute("name", "system.disabled");
  await expect(checkboxes.nth(1)).toHaveAttribute("name", "system.actions.pinned");
  await expect(checkboxes.nth(2)).toHaveAttribute("name", "system.showInCombatTab");
  for (const checkbox of await checkboxes.all()) {
    await expect(checkbox).toBeChecked();
  }

  await checkboxes.nth(0).uncheck();
  await expect
    .poll(async () => (await page.evaluate(
      ({ actorId, itemId }) => game.actors.get(actorId)?.items.get(itemId)?.system.disabled,
      { actorId, itemId },
    )))
    .toBe(false);
});

test("the name field carries the shared depleted (gray/strikethrough) treatment when the Ability is disabled", async ({
  foundryPage: page,
}) => {
  const { actorId, itemId } = await resetFixtures(page);
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);
  const nameInput = sheet.locator('input[name="name"]');

  await expect(nameInput).not.toHaveClass(/depleted/);

  await updateItem(page, actorId, itemId, { "system.disabled": true });
  await page.evaluate(({ actorId, itemId }) => game.actors.get(actorId)?.items.get(itemId)?.sheet.render(true), {
    actorId,
    itemId,
  });
  await expect(nameInput).toHaveClass(/depleted/);
});

test("sidebar Tags render from system.tags", async ({ foundryPage: page }) => {
  const { actorId, itemId } = await resetFixtures(page);
  await updateItem(page, actorId, itemId, { "system.tags": ["combat", "movement"] });
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);

  const chips = sheet.locator(".dos100-item-tag");
  await expect(chips).toHaveCount(2);
  await expect(chips.nth(0)).toHaveText("combat");
  await expect(chips.nth(1)).toHaveText("movement");
});

test("Description renders the rich-text editor bound to system.description; Details and Changes are selectable placeholders", async ({
  foundryPage: page,
}) => {
  const { actorId, itemId } = await resetFixtures(page);
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

  await openTab(sheet, "changes");
  await expect(sheet.locator('.tab[data-tab="changes"].active')).toContainText("Changes");
  await expect(sheet.locator('.tab[data-tab="changes"].active')).toContainText("This page doesn't have any content yet.");
});

test("the shell remains usable, without overflow, at representative sheet widths", async ({ foundryPage: page }) => {
  const { actorId, itemId } = await resetFixtures(page);
  const sheetId = await openItemSheet(page, actorId, itemId);
  const sheet = page.locator(`#${sheetId}`);

  for (const width of [640, 480, 360]) {
    await resizeSheet(page, sheetId, width);
    await expect(sheet.locator(".dos100-item-shell")).toBeVisible();
    const overflow = await sheet.locator(".dos100-item-shell").evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  }
});
