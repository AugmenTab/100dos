import { type Page } from "@playwright/test";
import { expect, test } from "./support/diagnostics.js";
import { resetFixtures } from "./support/fixtures.js";
import { openPcSheet } from "./support/pc-sheet.js";

type LedgerEntry = { type: string; description: string; value: number };

async function createWorldItem(
  page: Page,
  type: string,
  name: string,
  system: Record<string, unknown> = {},
): Promise<string> {
  return page.evaluate(
    async ({ type, name, system }) => {
      const item = await Item.create({ name, type, system });
      if (!item) throw new Error(`Failed to create world ${type}.`);
      return item.uuid;
    },
    { type, name, system },
  );
}

async function deleteWorldItem(page: Page, uuid: string): Promise<void> {
  await page.evaluate(async (uuid) => {
    const item = await fromUuid(uuid);
    await item?.delete();
  }, uuid);
}

async function fireDrop(page: Page, actorId: string, itemUuid: string): Promise<void> {
  await page.evaluate(
    ({ actorId, itemUuid }) => {
      const actor = game.actors.get(actorId);
      if (!actor?.sheet) throw new Error("Actor sheet not found.");
      const fakeEvent = {
        dataTransfer: { getData: () => JSON.stringify({ type: "Item", uuid: itemUuid }) },
      };
      void actor.sheet._onDrop(fakeEvent);
    },
    { actorId, itemUuid },
  );
}

async function xpLedger(page: Page, actorId: string): Promise<LedgerEntry[]> {
  return page.evaluate((actorId) => {
    const xp = game.actors.get(actorId)?.system.xp as { ledger: LedgerEntry[] } | undefined;
    return xp?.ledger ?? [];
  }, actorId) as Promise<LedgerEntry[]>;
}

async function abilityCount(page: Page, actorId: string): Promise<number> {
  return page.evaluate(
    (actorId) => game.actors.get(actorId)?.items.map(i => i.type).filter(t => t === "ability").length ?? 0,
    actorId,
  );
}

test("dropping an Ability onto the PC sheet opens the acquisition dialog showing the ability name and default XP cost", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId } = await resetFixtures(page, fixtureLane);
  const uuid = await createWorldItem(page, "ability", "Gravity Pulse", { xpCost: 25 });
  try {
    await openPcSheet(page, actorId);
    await fireDrop(page, actorId, uuid);

    const dialog = page.locator(".ability-acquisition-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Gravity Pulse");
    await expect(dialog.locator("input[name='xpCost']")).toHaveValue("25");
  } finally {
    await deleteWorldItem(page, uuid);
  }
});

test("Create adds the Ability to the actor and appends an XP purchase ledger entry at the default cost", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId } = await resetFixtures(page, fixtureLane);
  const uuid = await createWorldItem(page, "ability", "Gravity Pulse", { xpCost: 25 });
  try {
    await openPcSheet(page, actorId);
    await fireDrop(page, actorId, uuid);

    const dialog = page.locator(".ability-acquisition-dialog");
    await expect(dialog).toBeVisible();
    await dialog.locator("button[data-action='create']").click();
    await expect(dialog).not.toBeVisible();

    await expect.poll(() => abilityCount(page, actorId)).toBe(2);
    const ledger = await xpLedger(page, actorId);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]!.type).toBe("purchase");
    expect(ledger[0]!.description).toContain("Gravity Pulse");
    expect(ledger[0]!.value).toBe(25);
  } finally {
    await deleteWorldItem(page, uuid);
  }
});

test("Create uses the modal's edited XP value; the source Ability's stored xpCost is not altered", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId } = await resetFixtures(page, fixtureLane);
  const uuid = await createWorldItem(page, "ability", "Gravity Pulse", { xpCost: 25 });
  try {
    await openPcSheet(page, actorId);
    await fireDrop(page, actorId, uuid);

    const dialog = page.locator(".ability-acquisition-dialog");
    await expect(dialog).toBeVisible();
    await dialog.locator("input[name='xpCost']").fill("99");
    await dialog.locator("button[data-action='create']").click();
    await expect(dialog).not.toBeVisible();

    const ledger = await xpLedger(page, actorId);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]!.value).toBe(99);

    const storedCost = await page.evaluate(
      async (uuid) => {
        const item = await fromUuid(uuid) as { system?: { xpCost?: number } } | null;
        return item?.system?.xpCost;
      },
      uuid,
    );
    expect(storedCost).toBe(25);
  } finally {
    await deleteWorldItem(page, uuid);
  }
});

test("Skip adds the Ability to the actor without creating an XP ledger entry", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId } = await resetFixtures(page, fixtureLane);
  const uuid = await createWorldItem(page, "ability", "Gravity Pulse", { xpCost: 25 });
  try {
    await openPcSheet(page, actorId);
    await fireDrop(page, actorId, uuid);

    const dialog = page.locator(".ability-acquisition-dialog");
    await expect(dialog).toBeVisible();
    await dialog.locator("button[data-action='skip']").click();
    await expect(dialog).not.toBeVisible();

    await expect.poll(() => abilityCount(page, actorId)).toBe(2);
    const ledger = await xpLedger(page, actorId);
    expect(ledger).toHaveLength(0);
  } finally {
    await deleteWorldItem(page, uuid);
  }
});

test("Cancel aborts the drop — no Ability is created and no XP ledger entry is added", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId } = await resetFixtures(page, fixtureLane);
  const uuid = await createWorldItem(page, "ability", "Gravity Pulse", { xpCost: 25 });
  try {
    await openPcSheet(page, actorId);
    await fireDrop(page, actorId, uuid);

    const dialog = page.locator(".ability-acquisition-dialog");
    await expect(dialog).toBeVisible();
    await dialog.locator("button[data-action='cancelDialog']").click();
    await expect(dialog).not.toBeVisible();

    expect(await abilityCount(page, actorId)).toBe(1);
    const ledger = await xpLedger(page, actorId);
    expect(ledger).toHaveLength(0);
  } finally {
    await deleteWorldItem(page, uuid);
  }
});

test("Trait drops bypass the acquisition dialog and create the Trait directly on the actor", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId } = await resetFixtures(page, fixtureLane);
  const uuid = await createWorldItem(page, "trait", "[E2E] Trait Drop");
  try {
    await openPcSheet(page, actorId);
    await fireDrop(page, actorId, uuid);

    await expect.poll(() =>
      page.evaluate(
        (actorId) => game.actors.get(actorId)?.items.map(i => i.type).filter(t => t === "trait").length ?? 0,
        actorId,
      ),
    ).toBe(1);
    await expect(page.locator(".ability-acquisition-dialog")).not.toBeVisible();
  } finally {
    await deleteWorldItem(page, uuid);
  }
});

test("Effect drops bypass the acquisition dialog and create the Effect directly on the actor", async ({
  foundryPage: page,
  fixtureLane,
}) => {
  const { actorId } = await resetFixtures(page, fixtureLane);
  const uuid = await createWorldItem(page, "effect", "[E2E] Effect Drop");
  try {
    await openPcSheet(page, actorId);
    await fireDrop(page, actorId, uuid);

    await expect.poll(() =>
      page.evaluate(
        (actorId) => game.actors.get(actorId)?.items.map(i => i.type).filter(t => t === "effect").length ?? 0,
        actorId,
      ),
    ).toBe(1);
    await expect(page.locator(".ability-acquisition-dialog")).not.toBeVisible();
  } finally {
    await deleteWorldItem(page, uuid);
  }
});
