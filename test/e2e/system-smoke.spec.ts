import { expect, test } from "./support/diagnostics.js";
import { deleteFixtureAbility, resetFixtures } from "./support/fixtures.js";
import { getActorSnapshot, getItemSnapshot } from "./support/state.js";
import { type Page } from "@playwright/test";

async function openActorSheet(page: Page, actorId: string): Promise<string> {
  await page.locator('[data-action="tab"][data-tab="actors"]').click();
  await page
    .locator(
      `#actors li[data-entry-id="${actorId}"] a[data-action="activateEntry"]`,
    )
    .click();
  const sheetId = await page.evaluate((actorId) => {
    const actor = game.actors.get(actorId);
    if (!actor) throw new Error(`Fixture actor ${actorId} not found.`);
    return actor.sheet.id;
  }, actorId);
  await page.locator(`#${sheetId}`).waitFor();
  return sheetId;
}

async function closeActorSheet(page: Page, sheetId: string): Promise<void> {
  const sheet = page.locator(`#${sheetId}`);
  await sheet.locator('[data-action="close"]').click();
  await sheet.waitFor({ state: "detached" });
}

async function renderAbilitySheet(
  page: Page,
  actorId: string,
  itemId: string,
): Promise<string> {
  return page.evaluate(
    async ({ actorId, itemId }) => {
      const actor = game.actors.get(actorId);
      const item = actor?.items.get(itemId);
      if (!item)
        throw new Error(
          `Fixture Ability ${itemId} not found on actor ${actorId}.`,
        );
      await item.sheet.render(true);
      return item.sheet.id;
    },
    { actorId, itemId },
  );
}

test("PC name persists through the sheet", async ({ foundryPage: page }) => {
  const { actorId } = await resetFixtures(page);

  let sheetId = await openActorSheet(page, actorId);
  const nameInput = page.locator(`#${sheetId} input[name="name"]`);
  await nameInput.fill("[E2E] PC Renamed");
  await nameInput.blur();

  await expect
    .poll(async () => (await getActorSnapshot(page, actorId)).name)
    .toBe("[E2E] PC Renamed");

  await closeActorSheet(page, sheetId);
  sheetId = await openActorSheet(page, actorId);

  await expect(
    page.locator(`#${sheetId} input[name="name"]`),
  ).toHaveValue("[E2E] PC Renamed");

  const snapshot = await getActorSnapshot(page, actorId);
  expect(snapshot.name).toBe("[E2E] PC Renamed");

  await closeActorSheet(page, sheetId);
});

test("embedded Ability sheet persists and cleans up", async ({ foundryPage: page }) => {
  const { actorId, itemId } = await resetFixtures(page);

  let sheetId = await renderAbilitySheet(page, actorId, itemId);
  const nameInput = page.locator(`#${sheetId} input[name="name"]`);
  await nameInput.fill("[E2E] Ability Renamed");
  await nameInput.blur();

  await expect
    .poll(async () => (await getItemSnapshot(page, actorId, itemId)).name)
    .toBe("[E2E] Ability Renamed");

  await page.locator(`#${sheetId} [data-action="close"]`).click();
  await page.locator(`#${sheetId}`).waitFor({ state: "detached" });

  sheetId = await renderAbilitySheet(page, actorId, itemId);
  await expect(page.locator(`#${sheetId} input[name="name"]`)).toHaveValue(
    "[E2E] Ability Renamed",
  );

  const actorSnapshot = await getActorSnapshot(page, actorId);
  expect(actorSnapshot.items).toHaveLength(1);
  expect(actorSnapshot.items[0]).toMatchObject({
    id: itemId,
    name: "[E2E] Ability Renamed",
    type: "ability",
  });

  await page.locator(`#${sheetId} [data-action="close"]`).click();
  await page.locator(`#${sheetId}`).waitFor({ state: "detached" });

  await deleteFixtureAbility(page, actorId, itemId);

  const afterDelete = await getActorSnapshot(page, actorId);
  expect(afterDelete.items).toHaveLength(0);
});
