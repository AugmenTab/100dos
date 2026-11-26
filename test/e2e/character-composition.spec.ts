// Foundry-dependent coverage for Template, Race, and Soldier Type: modal
// editors persisting through real Document updates, XP-ledger acquisition
// by drop, exclusive activation through the Dashboard selectors, child
// activation propagation, and Template creation/activation from Features.
// Rendering of every state these drive is browser-tier
// (item-sheet-composition, foundation-dialogs, pc-sheet-composition). Each
// test shares one fixture reset and as few sheet opens as it can.
import { type Locator, type Page } from "@playwright/test";
import { expect, test } from "./support/diagnostics.js";
import { SYSTEM_ID } from "./support/constants.js";
import { openItemSheet, openTab } from "./support/item-sheet.js";
import { openPcSheet } from "./support/pc-sheet.js";

type LedgerEntry = { type: string; description: string; value: number };
type ItemState = { id: string; name: string; type: string; active: boolean };

const LINEUP = ["30", "35", "0", "40", "25", "30", "30", "45", "20", "15"];
const CHARACTERISTIC_IDS = ["str", "tou", "agi", "wfr", "wfm", "int", "per", "crg", "cha", "ldr"];

async function resetCompositionFixtures(page: Page, lane: number): Promise<{ actorId: string; ids: Record<string, string> }> {
  return page.evaluate(
    async ({ systemId, lane }) => {
      for (const actor of game.actors.filter(
        (a) => Boolean(a.getFlag(systemId, "e2eFixture")) && a.getFlag(systemId, "e2eLane") === lane,
      )) {
        await actor.delete();
      }
      const actor = await Actor.create({
        name: "[E2E] PC",
        type: "pc",
        flags: { [systemId]: { e2eFixture: "pc", e2eLane: lane } },
      });
      if (!actor) throw new Error("Failed to create fixture PC.");
      const created = await actor.createEmbeddedDocuments("Item", [
        { name: "[E2E] Race", type: "race" },
        { name: "[E2E] Soldier Type", type: "soldierType" },
      ]);
      return { actorId: actor.id, ids: Object.fromEntries(created.map((item) => [item.type, item.id])) };
    },
    { systemId: SYSTEM_ID, lane },
  );
}

async function itemSystem(page: Page, actorId: string, itemId: string): Promise<Record<string, unknown>> {
  return page.evaluate(
    ({ actorId, itemId }) => {
      const item = game.actors.get(actorId)?.items.get(itemId);
      if (!item) throw new Error(`Item ${itemId} not found.`);
      return JSON.parse(JSON.stringify(item.system)) as Record<string, unknown>;
    },
    { actorId, itemId },
  );
}

async function itemStates(page: Page, actorId: string): Promise<ItemState[]> {
  return page.evaluate(
    (actorId) =>
      game.actors.get(actorId)?.items.map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        active: (item.system as { active?: boolean }).active === true,
      })) ?? [],
    actorId,
  );
}

async function activeNames(page: Page, actorId: string, type: string): Promise<string[]> {
  return (await itemStates(page, actorId)).filter((i) => i.type === type && i.active).map((i) => i.name).sort();
}

async function xpLedger(page: Page, actorId: string): Promise<LedgerEntry[]> {
  return page.evaluate(
    (actorId) => (game.actors.get(actorId)?.system.xp as { ledger: LedgerEntry[] } | undefined)?.ledger ?? [],
    actorId,
  ) as Promise<LedgerEntry[]>;
}

async function createWorldItem(page: Page, type: string, name: string, system: Record<string, unknown> = {}): Promise<string> {
  return page.evaluate(
    async ({ type, name, system }) => {
      const item = await Item.create({ name, type, system });
      if (!item) throw new Error(`Failed to create world ${type}.`);
      return item.uuid;
    },
    { type, name, system },
  );
}

async function deleteWorldItems(page: Page, uuids: string[]): Promise<void> {
  await page.evaluate(async (uuids) => {
    for (const uuid of uuids) await (await fromUuid(uuid))?.delete();
  }, uuids);
}

async function fireDrop(page: Page, actorId: string, itemUuid: string): Promise<void> {
  await page.evaluate(
    ({ actorId, itemUuid }) => {
      const sheet = game.actors.get(actorId)?.sheet;
      if (!sheet) throw new Error("Actor sheet not found.");
      void sheet._onDrop({ dataTransfer: { getData: () => JSON.stringify({ type: "Item", uuid: itemUuid }) } });
    },
    { actorId, itemUuid },
  );
}

async function closeApp(page: Page, appId: string): Promise<void> {
  await page.evaluate(async (appId) => {
    await (foundry.applications.instances.get(appId) as unknown as { close(): Promise<unknown> } | undefined)?.close();
  }, appId);
}

function details(sheet: Locator): Locator {
  return sheet.locator('.tab[data-group="primary"][data-tab="details"]');
}

test("Race and Soldier Type foundational editors persist through their modals, and Cancel changes nothing", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  // One shared fixture and two sheet opens drive every editor, rather than
  // a reset per editor — so this single test needs more than the default
  // 60s budget under three concurrent workers.
  test.setTimeout(120_000);
  const { actorId, ids } = await resetCompositionFixtures(page, fixtureLane);

  // ── Race: required Base Characteristics, Mythic, Body Locations, Advances
  let sheetId = await openItemSheet(page, actorId, ids.race!);
  let sheet = page.locator(`#${sheetId}`);
  await openTab(sheet, "details");

  const charDialog = page.locator(".base-characteristics-dialog");
  await details(sheet).locator('button[data-action="editBaseCharacteristics"]').click();
  await expect(charDialog).toBeVisible();
  await charDialog.locator('input[name="str"]').fill("50");
  await charDialog.locator('button[data-action="cancelDialog"]').click();
  await expect(charDialog).not.toBeVisible();
  expect((await itemSystem(page, actorId, ids.race!)).baseCharacteristics).toBeNull();

  await details(sheet).locator('button[data-action="editBaseCharacteristics"]').click();
  await expect(charDialog).toBeVisible();
  // Nine of ten filled is refused: the dialog stays open, nothing is saved.
  for (const [i, id] of CHARACTERISTIC_IDS.slice(0, 9).entries()) await charDialog.locator(`input[name="${id}"]`).fill(LINEUP[i]!);
  await charDialog.locator('button[data-action="saveAndClose"]').click();
  await expect(charDialog).toBeVisible();
  expect((await itemSystem(page, actorId, ids.race!)).baseCharacteristics).toBeNull();
  await charDialog.locator('input[name="ldr"]').fill(LINEUP[9]!);
  await charDialog.locator('button[data-action="saveAndClose"]').click();
  await expect(charDialog).not.toBeVisible();
  await expect
    .poll(async () => (await itemSystem(page, actorId, ids.race!)).baseCharacteristics)
    .toEqual(Object.fromEntries(CHARACTERISTIC_IDS.map((id, i) => [id, Number(LINEUP[i])])));
  await expect(details(sheet).locator('button[data-action="deleteBaseCharacteristics"]')).toHaveCount(0);

  const mythicDialog = page.locator(".base-mythic-characteristics-dialog");
  await details(sheet).locator('button[data-action="editBaseMythicCharacteristics"]').click();
  await expect(mythicDialog).toBeVisible();
  await mythicDialog.locator('input[data-present-for="str"]').check();
  await mythicDialog.locator('input[name="str"]').fill("2");
  await mythicDialog.locator('input[data-present-for="agi"]').check();
  await mythicDialog.locator('input[name="agi"]').fill("0");
  await expect(mythicDialog.locator('input[name="tou"]')).toBeDisabled();
  await mythicDialog.locator('button[data-action="saveAndClose"]').click();
  await expect
    .poll(async () => (await itemSystem(page, actorId, ids.race!)).baseMythicCharacteristics)
    .toEqual({ str: 2, tou: null, agi: 0 });

  const locationDialog = page.locator(".body-location-dialog");
  await details(sheet).locator('button[data-action="addBodyLocation"]').click();
  await expect(locationDialog).toBeVisible();
  await locationDialog.locator('input[name="identifier"]').fill("leftWing");
  await locationDialog.locator('input[name="label"]').fill("Left Wing");
  await locationDialog.locator('select[name="type"]').selectOption("wing");
  await locationDialog.locator('select[name="placement"]').selectOption("left");
  await locationDialog.locator('button[data-action="saveAndClose"]').click();
  await expect
    .poll(async () => (await itemSystem(page, actorId, ids.race!)).bodyLocations)
    .toEqual({ leftWing: { type: "wing", label: "Left Wing", placement: "left", order: 0 } });

  // Editing keeps the stable identifier even as the label changes.
  await details(sheet).locator('button[data-action="editBodyLocation"][data-identifier="leftWing"]').click();
  await expect(locationDialog.locator('input[name="identifier"]')).toHaveAttribute("readonly", "");
  await locationDialog.locator('input[name="label"]').fill("Port Wing");
  await locationDialog.locator('button[data-action="saveAndClose"]').click();
  await expect
    .poll(async () => Object.keys((await itemSystem(page, actorId, ids.race!)).bodyLocations as object))
    .toEqual(["leftWing"]);

  await details(sheet).locator('button[data-action="addAdvance"]').click();
  await expect.poll(async () => ((await itemSystem(page, actorId, ids.race!)).advances as Record<string, number>).str).toBe(1);
  await details(sheet).locator('select[name="system.advances.str"]').selectOption({ label: "Intermediate" });
  await expect.poll(async () => ((await itemSystem(page, actorId, ids.race!)).advances as Record<string, number>).str).toBe(3);
  await details(sheet).locator('select[data-advance-row="str"]').selectOption({ label: "PER" });
  await expect
    .poll(async () => (await itemSystem(page, actorId, ids.race!)).advances)
    .toMatchObject({ str: 0, per: 3 });
  await details(sheet).locator('button[data-action="deleteAdvance"][data-characteristic="per"]').click();
  await expect.poll(async () => ((await itemSystem(page, actorId, ids.race!)).advances as Record<string, number>).per).toBe(0);

  // Persistence across closing and reopening the sheet.
  await closeApp(page, sheetId);
  sheetId = await openItemSheet(page, actorId, ids.race!);
  sheet = page.locator(`#${sheetId}`);
  await openTab(sheet, "details");
  await expect(details(sheet).locator('[data-base-characteristic="crg"]')).toHaveText("45");
  await expect(details(sheet).locator('[data-base-mythic-characteristic="tou"]')).toHaveText("Absent");
  await expect(details(sheet).locator('[data-body-location-id="leftWing"]')).toContainText("Port Wing");
  await closeApp(page, sheetId);

  // ── Soldier Type: every foundational property can be cleared to null
  sheetId = await openItemSheet(page, actorId, ids.soldierType!);
  sheet = page.locator(`#${sheetId}`);
  await openTab(sheet, "details");
  await details(sheet).locator('select[name="system.baseSize"]').selectOption("huge");
  await expect.poll(async () => (await itemSystem(page, actorId, ids.soldierType!)).baseSize).toBe("huge");
  await details(sheet).locator('select[name="system.baseSize"]').selectOption("");
  await expect.poll(async () => (await itemSystem(page, actorId, ids.soldierType!)).baseSize).toBeNull();

  await details(sheet).locator('button[data-action="addBodyLocation"]').click();
  await locationDialog.locator('input[name="identifier"]').fill("head");
  await locationDialog.locator('input[name="label"]').fill("Head");
  await locationDialog.locator('button[data-action="saveAndClose"]').click();
  await expect.poll(async () => (await itemSystem(page, actorId, ids.soldierType!)).bodyLocations).not.toBeNull();
  await details(sheet).locator('button[data-action="deleteBodyLocation"][data-identifier="head"]').click();
  await expect.poll(async () => (await itemSystem(page, actorId, ids.soldierType!)).bodyLocations).toBeNull();

  await page.evaluate(
    async ({ actorId, itemId }) => {
      await game.actors.get(actorId)?.items.get(itemId)?.update({
        "system.baseCharacteristics": { str: 1, tou: 1, agi: 1, wfr: 1, wfm: 1, int: 1, per: 1, crg: 1, cha: 1, ldr: 1 },
      });
    },
    { actorId, itemId: ids.soldierType! },
  );
  await details(sheet).locator('button[data-action="deleteBaseCharacteristics"]').click();
  await expect.poll(async () => (await itemSystem(page, actorId, ids.soldierType!)).baseCharacteristics).toBeNull();
  await closeApp(page, sheetId);
});

test("dropping Races and Soldier Types records XP once, and the Dashboard selectors switch between them exclusively", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId } = await resetCompositionFixtures(page, fixtureLane);
  // The fixture's own blank Race/Soldier Type would otherwise be selected.
  await page.evaluate(async (actorId) => {
    const actor = game.actors.get(actorId);
    if (actor) await actor.deleteEmbeddedDocuments("Item", actor.items.map((item) => item.id));
  }, actorId);

  const human = await createWorldItem(page, "race", "[E2E] Human", {
    xpCost: 100,
    grants: [{ kind: "child", type: "trait", name: "[E2E] Human Trait", system: {} }],
  });
  const elf = await createWorldItem(page, "race", "[E2E] Elf", { xpCost: 150 });
  const marine = await createWorldItem(page, "soldierType", "[E2E] Marine", { xpCost: 50 });
  try {
    const pcSheetId = await openPcSheet(page, actorId);
    const pcSheet = page.locator(`#${pcSheetId}`);
    const dialog = page.locator(".ability-acquisition-dialog");

    // Cancel leaves no Race, no child Trait, and no ledger entry.
    await fireDrop(page, actorId, human);
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("[E2E] Human");
    await expect(dialog.locator("input[name='xpCost']")).toHaveValue("100");
    await dialog.locator("button[data-action='cancelDialog']").click();
    await expect(dialog).not.toBeVisible();
    expect(await itemStates(page, actorId)).toEqual([]);
    expect(await xpLedger(page, actorId)).toEqual([]);

    // Create: the Race is acquired active, its child Trait granted, XP recorded.
    await fireDrop(page, actorId, human);
    await dialog.locator("button[data-action='create']").click();
    await expect.poll(() => activeNames(page, actorId, "race")).toEqual(["[E2E] Human"]);
    await expect.poll(() => activeNames(page, actorId, "trait")).toEqual(["[E2E] Human Trait"]);
    expect(await xpLedger(page, actorId)).toMatchObject([{ type: "purchase", value: 100 }]);
    expect((await xpLedger(page, actorId))[0]!.description).toContain("[E2E] Human");

    // A second Race becomes the selection; the first is deactivated, and so
    // is its child Trait.
    await fireDrop(page, actorId, elf);
    await dialog.locator("button[data-action='create']").click();
    await expect.poll(() => activeNames(page, actorId, "race")).toEqual(["[E2E] Elf"]);
    await expect.poll(() => activeNames(page, actorId, "trait")).toEqual([]);

    // Skip acquires a Soldier Type without a ledger entry; Race is unaffected.
    await fireDrop(page, actorId, marine);
    await dialog.locator("button[data-action='skip']").click();
    await expect.poll(() => activeNames(page, actorId, "soldierType")).toEqual(["[E2E] Marine"]);
    expect(await activeNames(page, actorId, "race")).toEqual(["[E2E] Elf"]);
    expect(await xpLedger(page, actorId)).toHaveLength(2);

    // Switching back through the selector: no new acquisition, no charge,
    // nothing deleted, and the child Trait follows its Race.
    const humanId = (await itemStates(page, actorId)).find((i) => i.name === "[E2E] Human")!.id;
    const raceSelect = pcSheet.locator('select[data-composition-select="race"]');
    await expect(raceSelect.locator("option")).toHaveText(["None", "[E2E] Elf", "[E2E] Human"]);
    await raceSelect.selectOption(humanId);
    await expect.poll(() => activeNames(page, actorId, "race")).toEqual(["[E2E] Human"]);
    await expect.poll(() => activeNames(page, actorId, "trait")).toEqual(["[E2E] Human Trait"]);
    expect(await xpLedger(page, actorId)).toHaveLength(2);

    // None deactivates every Race but keeps them owned; Soldier Type is independent.
    await pcSheet.locator('select[data-composition-select="race"]').selectOption("");
    await expect.poll(() => activeNames(page, actorId, "race")).toEqual([]);
    expect((await itemStates(page, actorId)).filter((i) => i.type === "race")).toHaveLength(2);
    expect(await activeNames(page, actorId, "soldierType")).toEqual(["[E2E] Marine"]);

    // The Item sheet's own Active checkbox respects exclusivity too.
    const elfId = (await itemStates(page, actorId)).find((i) => i.name === "[E2E] Elf")!.id;
    await page.evaluate(
      async ({ actorId, itemId }) => {
        await game.actors.get(actorId)?.items.get(itemId)?.update({ "system.active": true });
      },
      { actorId, itemId: humanId },
    );
    await page.evaluate(
      async ({ actorId, itemId }) => {
        await game.actors.get(actorId)?.items.get(itemId)?.update({ "system.active": true });
      },
      { actorId, itemId: elfId },
    );
    await expect.poll(() => activeNames(page, actorId, "race")).toEqual(["[E2E] Elf"]);
    await closeApp(page, pcSheetId);
  } finally {
    await deleteWorldItems(page, [human, elf, marine]);
  }
});

test("Templates are created from Features and any number may be active at once", async ({ foundryPage: page, fixtureLane }) => {
  const { actorId } = await resetCompositionFixtures(page, fixtureLane);
  const pcSheetId = await openPcSheet(page, actorId);
  const pcSheet = page.locator(`#${pcSheetId}`);
  await pcSheet.locator('[role="tab"][data-group="primary"][data-tab="features"]').click();

  const add = pcSheet.locator('button[data-action="createOwnedItem"][data-type="template"]');
  await add.click();
  await expect.poll(async () => (await itemStates(page, actorId)).filter((i) => i.type === "template")).toHaveLength(1);
  // The Add control opens the new Template's sheet for authoring.
  const templateId = (await itemStates(page, actorId)).find((i) => i.type === "template")!.id;
  const templateSheetId = await page.evaluate(
    ({ actorId, itemId }) => game.actors.get(actorId)?.items.get(itemId)?.sheet.id ?? "",
    { actorId, itemId: templateId },
  );
  await expect(page.locator(`#${templateSheetId}`)).toBeVisible();
  await closeApp(page, templateSheetId);

  await add.click();
  await expect.poll(async () => (await itemStates(page, actorId)).filter((i) => i.type === "template")).toHaveLength(2);
  await expect.poll(() => activeNames(page, actorId, "template")).toEqual(["New Template", "New Template"]);
  // The second Template's sheet opened over the PC sheet; close it too.
  const secondId = (await itemStates(page, actorId)).find((i) => i.type === "template" && i.id !== templateId)!.id;
  const secondSheetId = await page.evaluate(
    ({ actorId, itemId }) => game.actors.get(actorId)?.items.get(itemId)?.sheet.id ?? "",
    { actorId, itemId: secondId },
  );
  await expect(page.locator(`#${secondSheetId}`)).toBeVisible();
  await closeApp(page, secondSheetId);

  const templates = pcSheet.getByRole("region", { name: "Templates" });
  await templates.locator(`input[data-action="toggleItemActive"][data-item-id="${templateId}"]`).click();
  await expect.poll(async () => (await itemStates(page, actorId)).find((i) => i.id === templateId)?.active).toBe(false);
  expect(await activeNames(page, actorId, "template")).toHaveLength(1);
  // Templates never appear in the Dashboard selectors.
  await expect(pcSheet.locator('select[data-composition-select] option', { hasText: "New Template" })).toHaveCount(0);
  await closeApp(page, pcSheetId);
});
