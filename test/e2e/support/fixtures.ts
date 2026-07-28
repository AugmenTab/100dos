import { type Page } from "@playwright/test";
import { SYSTEM_ID } from "./constants.js";

export type FixtureIds = {
  actorId: string;
  itemId: string;
};

/**
 * Deletes only documents carrying the e2eFixture flag, then creates one
 * fresh PC Actor with one embedded Ability. The flag (not the name prefix)
 * is authoritative, so this never touches documents outside the harness's
 * own ownership.
 */
export async function resetFixtures(page: Page): Promise<FixtureIds> {
  return page.evaluate(async (systemId) => {
    const staleActors = game.actors.filter((a) =>
      Boolean(a.getFlag(systemId, "e2eFixture")),
    );
    for (const actor of staleActors) await actor.delete();

    const actor = await Actor.create({
      name: "[E2E] PC",
      type: "pc",
      flags: { [systemId]: { e2eFixture: "pc" } },
    });
    if (!actor) throw new Error("Failed to create fixture PC.");

    const [item] = await actor.createEmbeddedDocuments("Item", [
      {
        name: "[E2E] Ability",
        type: "ability",
        flags: { [systemId]: { e2eFixture: "ability" } },
      },
    ]);
    if (!item) throw new Error("Failed to create fixture Ability.");

    return { actorId: actor.id, itemId: item.id };
  }, SYSTEM_ID);
}

/** Removes the embedded Ability fixture as a fixture-cleanup operation, not user-facing delete coverage. */
export async function deleteFixtureAbility(
  page: Page,
  actorId: string,
  itemId: string,
): Promise<void> {
  await page.evaluate(
    async ({ actorId, itemId }) => {
      const actor = game.actors.get(actorId);
      if (!actor) throw new Error(`Fixture actor ${actorId} not found.`);
      await actor.deleteEmbeddedDocuments("Item", [itemId]);
    },
    { actorId, itemId },
  );
}
