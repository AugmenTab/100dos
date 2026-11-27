// Journey: before a session, the GM writes the homebrew content the players
// will pick up — a Trait, an Ability with an attack, and an Effect — entirely
// from the Items directory and the Item sheets.
import { ItemSheetView } from "./support/sheets.js";
import { expect, test } from "./support/table.js";

test("the GM prepares a Trait, an attack Ability and an Effect for the session", async ({ table }) => {
  const trait = table.name("Tough as Nails");
  const ability = table.name("Power Strike");
  const effect = table.name("Battle Fury");

  await table.beat("write a Trait that raises Wounds", async () => {
    const sheet = new ItemSheetView(table, await table.create("items", "trait", trait));
    await sheet.addChange({ mode: "add", formula: "5", category: "Health", target: "wounds" });
    await expect((await sheet.tab("changes")).locator("tbody tr").first()).toContainText("Wounds");
    await table.close(sheet.root);
  });

  await table.beat("write an Ability with a once-per-encounter melee attack", async () => {
    const sheet = new ItemSheetView(table, await table.create("items", "ability", ability));
    await sheet.tab("details");
    await sheet.enter("system.xpCost", "200");
    await sheet.enter("system.summary", "A single, devastating blow.");
    await sheet.addAction({
      name: "Power Strike",
      activation: "full",
      uses: { per: "encounter", value: "1" },
      type: "meleeAttack",
      attack: { name: "Strike", characteristic: "str", bonus: "10" },
      damage: { dice: "2", die: "d10", base: "5", pierce: "2" },
    });
    await sheet.addChange({ mode: "add", formula: "10", target: "allCharacteristicTests" });
    await table.close(sheet.root);
  });

  await table.beat("link Tough as Nails to Power Strike so taking the Ability grants the Trait", async () => {
    const sheet = new ItemSheetView(table, await table.open("items", ability));
    const links = await sheet.tab("links");
    const children = links.locator('section[data-group="links"][data-tab="children"]');
    await table.drag("items", trait, children);
    await expect(children.locator("tbody tr").first()).toContainText(trait);
    await table.close(sheet.root);
  });

  await table.beat("write a three-round Effect", async () => {
    const sheet = new ItemSheetView(table, await table.create("items", "effect", effect));
    await sheet.tab("details");
    await sheet.enter("system.duration.formula", "3");
    await sheet.addChange({ mode: "add", formula: "10", target: "allCharacteristicTests" });
    await table.close(sheet.root);
  });

  await table.beat("reopen each Item and find it as written", async () => {
    const abilitySheet = new ItemSheetView(table, await table.open("items", ability));
    const details = await abilitySheet.tab("details");
    await expect(abilitySheet.root.locator('[name="system.xpCost"]')).toHaveValue("200");
    await expect(details.locator("table.dense-table").first()).toContainText("Power Strike");
    await table.close(abilitySheet.root);

    const saved = await table.worldItem(ability);
    const actions = Object.values((saved.system.actions as { items: Record<string, Record<string, unknown>> }).items);
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      name: "Power Strike",
      type: "meleeAttack",
      activation: { type: "full" },
      uses: { per: "encounter", value: 1 },
      attack: { name: "Strike", characteristic: "str", bonus: "10" },
      damage: { dice: { count: 2, die: "d10" }, base: "5", pierce: "2" },
    });
    expect((saved.system.changes as { computed: unknown[] }).computed).toMatchObject([
      { mode: "add", formula: "10", target: "allCharacteristicTests" },
    ]);
    expect(saved.system.grants).toMatchObject([
      { kind: "child", type: "trait", name: trait, system: { changes: { computed: [{ target: "wounds", formula: "5" }] } } },
    ]);
    expect((await table.worldItem(trait)).system.changes).toMatchObject({ computed: [{ target: "wounds", formula: "5" }] });
    expect((await table.worldItem(effect)).system).toMatchObject({ duration: { formula: "3" } });
  });

  await table.pending("set the attack's maximum uses", "uses.max comes from a formula nothing evaluates, and no field sets it");
});
