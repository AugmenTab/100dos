import { type Locator, type Page } from "@playwright/test";

/** Generic across any embedded Item type (Ability, Trait, ...) — nothing here assumes a specific one. */
export async function updateItem(page: Page, actorId: string, itemId: string, data: Record<string, unknown>): Promise<void> {
  await page.evaluate(
    async ({ actorId, itemId, data }) => {
      const item = game.actors.get(actorId)?.items.get(itemId);
      if (!item) throw new Error(`Fixture Item ${itemId} not found on actor ${actorId}.`);
      await item.update(data);
    },
    { actorId, itemId, data },
  );
}

export async function openItemSheet(page: Page, actorId: string, itemId: string): Promise<string> {
  return page.evaluate(
    async ({ actorId, itemId }) => {
      const item = game.actors.get(actorId)?.items.get(itemId);
      if (!item) throw new Error(`Fixture Item ${itemId} not found on actor ${actorId}.`);
      await item.sheet.render(true);
      return item.sheet.id;
    },
    { actorId, itemId },
  );
}

export async function openTab(sheet: Locator, tabId: string): Promise<void> {
  await sheet.locator(`[role="tab"][data-group="primary"][data-tab="${tabId}"]`).click();
}
