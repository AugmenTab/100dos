// Journey: an ordinary session with a finished character — use an Ability,
// run out of uses, take damage, pick up a status and an Effect, and get the
// Ability back when the encounter ends. Beats the system can't perform yet
// (every roll) stay in the script as pending, in the order they'd happen.
import { PcSheetView } from "./support/sheets.js";
import { expect, test } from "./support/table.js";
import { SYSTEM_ID } from "../e2e/support/constants.js";

test("a player plays through a combat encounter", async ({ table }) => {
  const hero = table.name("Kara Voss");
  const strike = table.name("Power Strike");

  await table.givenCharacter("a built character with a pinned once-per-encounter attack", {
    name: hero,
    system: { wounds: { value: 20, max: 20 } },
    items: [
      {
        name: strike,
        type: "ability",
        system: {
          actions: {
            pinned: true,
            items: {
              strike0000000001: {
                id: "strike0000000001",
                name: "Power Strike",
                type: "meleeAttack",
                activation: { type: "full", cost: null },
                // max is seeded: nothing in the UI can set it (see the GM journey).
                uses: { per: "encounter", value: 1, max: 1, formula: "", itemCost: { value: 0, formula: "", perAttack: false }, actionCost: { value: 1, formula: "", perAttack: false } },
              },
            },
          },
        },
      },
    ],
  });

  const strikeUses = async (): Promise<number> => {
    const ability = (await table.actor(hero)).items.find((i) => i.name === strike)!;
    return (ability.system.actions as { items: Record<string, { uses: { value: number } }> }).items.strike0000000001!.uses.value;
  };

  let pc!: PcSheetView;

  await table.beat("open the character from the Actors directory", async () => {
    pc = new PcSheetView(table, await table.open("actors", hero));
    await pc.tab("dashboard");
  });

  await table.beat("use Power Strike from Quick Use, spending its one use", async () => {
    await pc.root.getByRole("button", { name: strike }).click();
    await expect.poll(strikeUses).toBe(0);
  });

  await table.pending("roll the attack and then its damage", "no roll engine or chat card exists");

  await table.beat("try Power Strike again: a warning, and nothing spent", async () => {
    await pc.root.getByRole("button", { name: strike }).click();
    await expect(table.page.locator("#notifications")).toContainText(`${strike}: Power Strike: No uses remaining.`);
    expect(await strikeUses()).toBe(0);
  });

  await table.beat("take 8 damage by lowering Wounds", async () => {
    await pc.enter("system.wounds.value", "12");
    await expect.poll(async () => (await table.actor(hero)).system.wounds).toMatchObject({ value: 12 });
  });

  await table.beat("get stunned from the Effects tab", async () => {
    const effects = await pc.tab("effects");
    await effects.locator('button[data-action="toggleStatus"][data-status-id="stunned"]').click();
    await expect.poll(async () => (await table.actor(hero)).statuses).toContain("stunned");
  });

  await table.pending("see the stun penalize tests", "statuses carry no Changes and no Changes engine exists");

  await table.beat("gain a temporary Effect and switch it on", async () => {
    const effects = await pc.tab("effects");
    await effects.getByRole("button", { name: "Add Temporary Effect" }).click();
    const toggle = effects.getByRole("checkbox", { name: "Toggle Active: New Effect" });
    await expect(toggle).toHaveCount(1);
    const wasActive = await toggle.isChecked();
    await toggle.click();
    await expect.poll(async () => (await table.actor(hero)).items.find((i) => i.name === "New Effect")?.system.active).toBe(!wasActive);
  });

  await table.beat("the GM runs the encounter to its end, and Power Strike comes back", async () => {
    // The GM's encounter goes through the API: adding a combatant in the
    // Combat Tracker needs a token on the canvas, which the harness disables.
    await table.page.evaluate(
      async ({ hero, systemId, lane }) => {
        const actor = game.actors.getName(hero)!;
        const combat = await Combat.create({ flags: { [systemId]: { simLane: lane } } });
        await combat!.createEmbeddedDocuments("Combatant", [{ actorId: actor.id }]);
        await combat!.startCombat();
        await combat!.delete();
      },
      { hero, systemId: SYSTEM_ID, lane: table.lane },
    );
    await expect.poll(strikeUses).toBe(1);
  });

  await table.pending("make a Skill test", "Skill roll buttons are inert");
  await table.pending("rest to recover Wounds and Fatigue", "the Rest button has no handler");

  await table.close(pc.root);
});
