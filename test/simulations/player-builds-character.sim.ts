// Journey: a player makes a character from nothing, the way they would at
// session zero — create the Actor, pick a Race and Soldier Type, buy Skills,
// an Education and an Ability, pick up a Trait, and check what it all cost.
import { ItemSheetView, PcSheetView } from "./support/sheets.js";
import { expect, test } from "./support/table.js";

test("a player builds a character from a blank Actor", async ({ table }) => {
  const hero = table.name("Kara Voss");
  const human = table.name("Human");
  const marine = table.name("Marine");
  const strike = table.name("Power Strike");
  const tough = table.name("Tough as Nails");
  const veteran = table.name("Veteran");

  await table.given("the GM's world already has a Race, a Soldier Type, an Ability and a Trait", [
    {
      name: human,
      type: "race",
      system: {
        xpCost: 0,
        baseCharacteristics: { str: 30, tou: 30, agi: 30, wfr: 30, wfm: 30, int: 30, per: 30, crg: 30, cha: 30, ldr: 30 },
        bodyLocations: {
          head: { type: "head", label: "Head", placement: "none", order: 0 },
          torso: { type: "torso", label: "Torso", placement: "none", order: 0 },
        },
      },
    },
    { name: marine, type: "soldierType", system: { xpCost: 50 } },
    { name: strike, type: "ability", system: { xpCost: 200 } },
    { name: tough, type: "trait" },
  ]);

  let pc!: PcSheetView;

  await table.beat("create a PC from the Actors directory and fill in the basics", async () => {
    pc = new PcSheetView(table, await table.create("actors", "pc", hero));
    await pc.tab("dashboard");
    await pc.enter("system.basic.height", "178 cm");
    await pc.enter("system.basic.age", "27");
    await expect.poll(async () => (await table.actor(hero)).system.basic).toMatchObject({ height: "178 cm", age: 27 });
  });

  await table.beat("pick a Race by dragging it onto the sheet, skipping its zero XP", async () => {
    await pc.acquire(human, "skip", "dashboard");
    await expect(pc.root.locator('select[data-composition-select="race"] option:checked')).toHaveText(human);
  });

  await table.beat("pick a Soldier Type and record its XP", async () => {
    await pc.acquire(marine, "record", "dashboard");
    await expect(pc.root.locator('select[data-composition-select="soldierType"] option:checked')).toHaveText(marine);
  });

  await table.pending("see the Race's Characteristics on the sheet", "no derivation layer moves Race foundations onto the Actor");

  await table.beat("add a Skill and train it, recording the XP", async () => {
    const skills = await pc.tab("skills");
    await skills.locator('button[data-action="createSkill"]').click();
    const dialog = table.page.locator(".actor-skill-dialog");
    await dialog.locator('input[name="name"]').fill("Pilot (Ground)");
    await dialog.locator('input[name="system.cost.trained"]').fill("100");
    await dialog.locator('input[data-array-field="system.characteristics"][value="agi"]').check();
    await dialog.locator('input[name="system.identifier"]').fill("pilotGround");
    await dialog.locator('button[data-action="saveAndClose"]').click();
    await expect(dialog).toHaveCount(0);

    await skills.locator('select[name="system.skills.pilotGround.training"]').selectOption("trained");
    await pc.answerXp("record");
    await expect(skills.locator('select[name="system.skills.pilotGround.training"]')).toHaveValue("trained");
  });

  await table.beat("add an Education and raise it to +10, recording the XP", async () => {
    const skills = await pc.tab("skills");
    await skills.locator('button[data-action="createEducation"]').click();
    const dialog = table.page.locator(".actor-education-dialog");
    await dialog.locator('input[name="name"]').fill("Navigation");
    await dialog.locator('input[name="system.cost.plus10"]').fill("75");
    await dialog.locator('input[name="system.identifier"]').fill("navigation");
    await dialog.locator('button[data-action="saveAndClose"]').click();
    await expect(dialog).toHaveCount(0);

    await skills.locator('select[name="system.educations.navigation.training"]').selectOption("plus10");
    await pc.answerXp("record");
    await expect(skills.locator('select[name="system.educations.navigation.training"]')).toHaveValue("plus10");
  });

  await table.beat("buy an Ability by dragging it onto the sheet", async () => {
    await pc.acquire(strike, "record");
    await expect((await pc.tab("features")).getByRole("button", { name: `Edit ${strike}` })).toHaveCount(1);
  });

  await table.beat("pick up a Trait, which costs no XP and raises no prompt", async () => {
    await pc.acquire(tough, "none");
    await expect((await pc.tab("features")).getByRole("button", { name: `Edit ${tough}` })).toHaveCount(1);
  });

  await table.beat("link a copy of the Trait to the owned Ability as its child", async () => {
    await (await pc.tab("features")).getByRole("button", { name: `Edit ${strike}` }).click();
    const ability = new ItemSheetView(table, await table.ownedItemSheet(hero, strike));
    await ability.tab("links");
    const children = ability.root.locator('section[data-group="links"][data-tab="children"]');
    await table.drag("items", tough, children);
    await expect(children.locator("tbody")).toContainText(tough);
    await table.close(ability.root);
  });

  await table.beat("add a Template from Features and name it", async () => {
    await (await pc.tab("features")).getByRole("button", { name: "Add Template" }).click();
    const template = new ItemSheetView(table, await table.ownedItemSheet(hero, "New Template"));
    await template.enter("name", veteran);
    await expect.poll(async () => (await table.actor(hero)).items.map((i) => i.name)).toContain(veteran);
    await table.close(template.root);
  });

  await table.beat("review the XP ledger: one entry per recorded purchase", async () => {
    const xp = await pc.recordTab("xp");
    const rows = xp.locator("tbody tr");
    await expect(rows).toHaveCount(4);
    for (const [description, value] of [
      [marine, "50"],
      ["Pilot (Ground)", "100"],
      ["Navigation", "75"],
      [strike, "200"],
    ] as const) {
      await expect(rows.filter({ hasText: description }).locator(".dense-table-value")).toHaveText(value);
    }
  });

  await table.pending("see XP Spent and Available reflect the purchases", "XP totals are never recalculated from the ledger");

  await table.beat("the finished character holds everything the player chose", async () => {
    const saved = await table.actor(hero);
    expect(saved.items.map((i) => [i.type, i.name]).sort()).toEqual(
      [
        ["ability", strike],
        ["race", human],
        ["soldierType", marine],
        ["template", veteran],
        ["trait", tough],
        ["trait", tough],
      ].sort(),
    );
    expect(saved.items.filter((i) => i.type === "race" || i.type === "soldierType").every((i) => i.system.active)).toBe(true);
    await table.close(pc.root);
  });
});
