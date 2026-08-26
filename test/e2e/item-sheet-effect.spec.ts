// Structural Effect Item sheet tests (shell render, sidebar controls,
// overflow) live in test/browser/item-sheet-effect.spec.ts — they only
// need static rendering. This file covers the one test that genuinely
// requires a live Foundry world: verifying that the grant source line
// is resolved from the existing grant system (the grantedBy flag set by
// _onCreate) rather than a separate Effect-specific source field.
import { expect, test } from "./support/diagnostics.js";
import { resetEffectSourceFixtures } from "./support/fixtures.js";
import { openItemSheet } from "./support/item-sheet.js";
import { SYSTEM_ID } from "./support/constants.js";

test("child Effect sheet displays grant source resolved from the grant system: 'Name (Type)' appears beneath the Effect heading", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId, grantingItemId } = await resetEffectSourceFixtures(page, fixtureLane);

  // _createGrants is async (void-fired from _onCreate), so wait for the
  // childItemIds flag to be populated before querying the child Effect.
  await page.waitForFunction(
    ({ actorId, grantingItemId, systemId }) => {
      const ability = game.actors.get(actorId)?.items.get(grantingItemId);
      const ids = ability?.getFlag(systemId, "childItemIds") as string[] | undefined;
      return (ids?.length ?? 0) > 0;
    },
    { actorId, grantingItemId, systemId: SYSTEM_ID },
    { timeout: 10_000 },
  );

  const childEffectId = await page.evaluate(
    ({ actorId, grantingItemId, systemId }) => {
      const ability = game.actors.get(actorId)?.items.get(grantingItemId);
      const ids = ability?.getFlag(systemId, "childItemIds") as string[] | undefined;
      return ids?.[0] ?? null;
    },
    { actorId, grantingItemId, systemId: SYSTEM_ID },
  );
  if (!childEffectId) throw new Error("Child Effect ID not found after waiting.");

  const sheetId = await openItemSheet(page, actorId, childEffectId);
  const sheet = page.locator(`#${sheetId}`);

  const grantSource = sheet.locator(".dos100-item-grant-source");
  await expect(grantSource).toBeVisible();
  await expect(grantSource).toHaveText("[E2E] Granting Ability (Ability)");
});
