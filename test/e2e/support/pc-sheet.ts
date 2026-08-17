import { type Page } from "@playwright/test";

export async function openPcSheet(page: Page, actorId: string): Promise<string> {
  return page.evaluate(async (actorId) => {
    const actor = game.actors.get(actorId);
    if (!actor) throw new Error(`Fixture actor ${actorId} not found.`);
    await actor.sheet.render(true);
    return actor.sheet.id;
  }, actorId);
}

export async function rerenderPcSheet(page: Page, actorId: string): Promise<void> {
  await page.evaluate(async (actorId) => {
    const actor = game.actors.get(actorId);
    if (!actor) throw new Error(`Fixture actor ${actorId} not found.`);
    await actor.sheet.render(true);
  }, actorId);
}

export async function resizePcSheet(page: Page, sheetId: string, width: number): Promise<void> {
  await page.evaluate(
    ({ sheetId, width }) => {
      const app = foundry.applications.instances.get(sheetId);
      if (!app) throw new Error(`Rendered application ${sheetId} not found.`);
      app.setPosition({ width });
    },
    { sheetId, width },
  );
}
