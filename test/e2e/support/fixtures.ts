import { type Page } from "@playwright/test";
import { SYSTEM_ID } from "./constants.js";

export type FixtureIds = {
  actorId: string;
  itemId: string;
};

/**
 * Deletes only documents carrying this worker's own e2eFixture+e2eLane
 * flags, then creates one fresh PC Actor with one embedded Ability owned by
 * that lane. The flags (not the name prefix) are authoritative, so this
 * never touches documents outside the harness's own ownership — and lane
 * scoping means concurrent Playwright workers, each with their own
 * persistent Foundry session (see support/session.ts), never delete or
 * race on each other's fixture Documents. Visible names stay identical
 * across lanes (only the flags carry lane identity) so UI assertions don't
 * need to know the suite runs in parallel.
 */
export async function resetFixtures(page: Page, lane: number): Promise<FixtureIds> {
  return page.evaluate(
    async ({ systemId, lane }) => {
      const staleActors = game.actors.filter(
        (a) => Boolean(a.getFlag(systemId, "e2eFixture")) && a.getFlag(systemId, "e2eLane") === lane,
      );
      for (const actor of staleActors) await actor.delete();

      const actor = await Actor.create({
        name: "[E2E] PC",
        type: "pc",
        flags: { [systemId]: { e2eFixture: "pc", e2eLane: lane } },
      });
      if (!actor) throw new Error("Failed to create fixture PC.");

      const [item] = await actor.createEmbeddedDocuments("Item", [
        {
          name: "[E2E] Ability",
          type: "ability",
          flags: { [systemId]: { e2eFixture: "ability", e2eLane: lane } },
        },
      ]);
      if (!item) throw new Error("Failed to create fixture Ability.");

      return { actorId: actor.id, itemId: item.id };
    },
    { systemId: SYSTEM_ID, lane },
  );
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

/**
 * Separate from resetFixtures (PC + Ability) rather than folded into it —
 * resetFixtures is shared by nearly every e2e file in the suite, and most
 * of those don't touch Trait at all, so adding a Trait Item to every one
 * of those resets would be pure overhead. Only the Trait sheet's own tests
 * call this. Mirrors resetFixtures' shape/behavior (own [E2E] PC, own
 * lane-scoped stale-cleanup, own e2eFixture flag) rather than reusing the
 * Ability fixture's Actor, so Trait tests stay isolated from Ability's.
 */
export async function resetTraitFixtures(page: Page, lane: number): Promise<FixtureIds> {
  return page.evaluate(
    async ({ systemId, lane }) => {
      const staleActors = game.actors.filter(
        (a) => Boolean(a.getFlag(systemId, "e2eFixture")) && a.getFlag(systemId, "e2eLane") === lane,
      );
      for (const actor of staleActors) await actor.delete();

      const actor = await Actor.create({
        name: "[E2E] PC",
        type: "pc",
        flags: { [systemId]: { e2eFixture: "pc", e2eLane: lane } },
      });
      if (!actor) throw new Error("Failed to create fixture PC.");

      const [item] = await actor.createEmbeddedDocuments("Item", [
        {
          name: "[E2E] Trait",
          type: "trait",
          flags: { [systemId]: { e2eFixture: "trait", e2eLane: lane } },
        },
      ]);
      if (!item) throw new Error("Failed to create fixture Trait.");

      return { actorId: actor.id, itemId: item.id };
    },
    { systemId: SYSTEM_ID, lane },
  );
}
