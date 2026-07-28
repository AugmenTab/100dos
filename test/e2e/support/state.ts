import { type Page } from "@playwright/test";

export type ActorSnapshot = {
  id: string;
  name: string;
  type: string;
  items: Array<{ id: string; name: string; type: string }>;
};

export type ItemSnapshot = {
  id: string;
  name: string;
  type: string;
  actorId: string | null;
};

export async function getActorSnapshot(
  page: Page,
  actorId: string,
): Promise<ActorSnapshot> {
  return page.evaluate((actorId) => {
    const actor = game.actors.get(actorId);
    if (!actor) throw new Error(`Actor ${actorId} not found.`);
    return {
      id: actor.id,
      name: actor.name,
      type: actor.type,
      items: actor.items.map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
      })),
    };
  }, actorId);
}

export async function getItemSnapshot(
  page: Page,
  actorId: string,
  itemId: string,
): Promise<ItemSnapshot> {
  return page.evaluate(
    ({ actorId, itemId }) => {
      const actor = game.actors.get(actorId);
      const item = actor?.items.get(itemId);
      if (!item)
        throw new Error(`Item ${itemId} not found on actor ${actorId}.`);
      return {
        id: item.id,
        name: item.name,
        type: item.type,
        actorId: item.actor?.id ?? null,
      };
    },
    { actorId, itemId },
  );
}
