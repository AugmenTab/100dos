import { expect, test } from "./support/diagnostics.js";
import { resetFixtures } from "./support/fixtures.js";
import { openPcSheet, rerenderPcSheet, resizePcSheet } from "./support/pc-sheet.js";
import { type Page } from "@playwright/test";

// carried (45) < felt (38)? No — felt (38) is lower than carried (45),
// representing equipped Armor's Felt Weight discount. Each track's own
// thresholds are chosen relative to this one shared felt to land at
// specific, exactly-checkable band states (see .local/seed-test-pc.js,
// which this mirrors): base fully exceeds every threshold (all 3 bands
// 100%), fly lands partway through its first band only, swim lands at an
// exact 72% through the third of its 4 bands.
const ENCUMBRANCE = {
  carried: 45,
  felt: 38,
  total: 127,
  thresholds: {
    base: {
      carry: { value: 20, contributions: [] },
      encumbered: { value: 28, contributions: [] },
      heavy: { value: 35, contributions: [] },
      lift: { value: 35, contributions: [{ label: "Base", value: 35 }] },
      push: { value: 60, contributions: [] },
    },
    swim: {
      carry: { value: 10, contributions: [] },
      encumbered: { value: 20, contributions: [] },
      heavy: { value: 45, contributions: [] },
      maximum: { value: 70, contributions: [] },
    },
    fly: {
      carry: { value: 80, contributions: [] },
      encumbered: { value: 120, contributions: [] },
    },
  },
};

async function updateActor(page: Page, actorId: string, data: Record<string, unknown>): Promise<void> {
  await page.evaluate(
    async ({ actorId, data }) => {
      const actor = game.actors.get(actorId);
      if (!actor) throw new Error(`Fixture actor ${actorId} not found.`);
      await actor.update(data);
    },
    { actorId, data },
  );
}

function bandFills(sheet: ReturnType<Page["locator"]>) {
  return sheet.locator(".pc-encumbrance-bar-fill");
}

test("the carrying-capacity Top Summary and Bottom Reference render stored Encumbrance/Finances data", async ({
  foundryPage: page,
}) => {
  const { actorId } = await resetFixtures(page);
  await updateActor(page, actorId, {
    "system.encumbrance": ENCUMBRANCE,
    "system.finances.carried": 1250,
  });
  const sheetId = await openPcSheet(page, actorId);
  const sheet = page.locator(`#${sheetId}`);
  await sheet.locator('[role="tab"][data-group="primary"][data-tab="inventory"]').click();

  const encumbranceSection = sheet.locator(".pc-inventory-encumbrance");
  await expect(encumbranceSection).toContainText("45 kgs");
  await expect(encumbranceSection).toContainText("38 kgs");
  await expect(encumbranceSection).toContainText("127 kgs");
  await expect(encumbranceSection).toContainText("1,250");

  // Bottom Reference: Carry/Lift/Push, each with a real Contributions
  // tooltip (unlike the Top Summary's plain carried/felt/total/value).
  await expect(encumbranceSection).toContainText("20 kgs");
  await expect(encumbranceSection).toContainText("35 kgs");
  await expect(encumbranceSection).toContainText("60 kgs");
  const liftCell = encumbranceSection.locator('[data-tooltip-html*="Lift"]');
  await expect(liftCell).toHaveAttribute("data-tooltip-html", /Base/);
});

test("switching movement mode changes the active bar track — 3 base / 4 swim / 2 fly — with exact fill percentages", async ({
  foundryPage: page,
}) => {
  const { actorId } = await resetFixtures(page);
  await updateActor(page, actorId, { "system.encumbrance": ENCUMBRANCE, "system.movement.mode": "land" });
  const sheetId = await openPcSheet(page, actorId);
  const sheet = page.locator(`#${sheetId}`);
  await sheet.locator('[role="tab"][data-group="primary"][data-tab="inventory"]').click();

  const fills = bandFills(sheet);
  await expect(fills).toHaveCount(3);
  for (const style of await fills.evaluateAll((els) => els.map((el) => el.getAttribute("style")))) {
    expect(style).toContain("width: 100%");
  }
  await expect(sheet.locator(".pc-encumbrance-bar-label").first()).toContainText("Normal (20 kgs)");

  await updateActor(page, actorId, { "system.movement.mode": "swim" });
  await rerenderPcSheet(page, actorId);
  await sheet.locator('[role="tab"][data-group="primary"][data-tab="inventory"]').click();
  const swimFills = bandFills(sheet);
  await expect(swimFills).toHaveCount(4);
  const swimStyles = await swimFills.evaluateAll((els) => els.map((el) => el.getAttribute("style")));
  expect(swimStyles).toEqual(["width: 100%", "width: 100%", "width: 72%", "width: 0%"]);
  const swimLabels = await sheet.locator(".pc-encumbrance-bar-label").allTextContents();
  expect(swimLabels.map((l) => l.trim())).toEqual([
    "Normal (10 kgs)",
    "Encumbered (20 kgs)",
    "Heavy (45 kgs)",
    "Maximum Load (70 kgs)",
  ]);

  await updateActor(page, actorId, { "system.movement.mode": "fly" });
  await rerenderPcSheet(page, actorId);
  await sheet.locator('[role="tab"][data-group="primary"][data-tab="inventory"]').click();
  const flyFills = bandFills(sheet);
  await expect(flyFills).toHaveCount(2);
  const flyStyles = await flyFills.evaluateAll((els) => els.map((el) => el.getAttribute("style")));
  expect(flyStyles).toEqual(["width: 47.5%", "width: 0%"]);
});

test("fly renders no bars when the Actor has no Flight movement mode (thresholds.fly is null)", async ({ foundryPage: page }) => {
  const { actorId } = await resetFixtures(page);
  await updateActor(page, actorId, {
    "system.encumbrance": { ...ENCUMBRANCE, thresholds: { ...ENCUMBRANCE.thresholds, fly: null } },
    "system.movement.mode": "fly",
  });
  const sheetId = await openPcSheet(page, actorId);
  const sheet = page.locator(`#${sheetId}`);
  await sheet.locator('[role="tab"][data-group="primary"][data-tab="inventory"]').click();

  await expect(bandFills(sheet)).toHaveCount(0);
});

test("Armor rows render Carried/Equipped toggles, quantity suffix, and depleted styling from real Item data, and toggling Carried persists", async ({
  foundryPage: page,
}) => {
  const { actorId } = await resetFixtures(page);
  const leatherArmorId = await page.evaluate(async (actorId) => {
    const actor = game.actors.get(actorId);
    if (!actor) throw new Error("no actor");
    const [leather] = await actor.createEmbeddedDocuments("Item", [
      {
        name: "[E2E] Leather Armor",
        type: "armor",
        system: {
          carried: true,
          equipped: false,
          quantity: 2,
          slot: "armor",
          weight: { actual: { each: 12, total: 24 }, felt: { each: 12, total: 24 } },
        },
      },
      {
        name: "[E2E] Buckler",
        type: "armor",
        system: {
          carried: false,
          equipped: false,
          quantity: 0,
          slot: "armor",
          weight: { actual: { each: 5, total: 0 }, felt: { each: 5, total: 0 } },
        },
      },
    ]);
    return leather.id;
  }, actorId);

  const sheetId = await openPcSheet(page, actorId);
  const sheet = page.locator(`#${sheetId}`);
  await sheet.locator('[role="tab"][data-group="primary"][data-tab="inventory"]').click();

  const armorSection = sheet.getByRole("region", { name: "Armor / Shields" });
  await expect(armorSection).toContainText("[E2E] Leather Armor (×2)");
  await expect(armorSection.locator(".depleted")).toContainText("[E2E] Buckler");
  await expect(armorSection).toContainText("24 kgs");

  const leatherRow = armorSection.locator("tr", { hasText: "[E2E] Leather Armor" });
  const carriedToggle = leatherRow.locator('[data-action="toggleItemCarried"]');
  await expect(carriedToggle).toHaveAttribute("aria-pressed", "true");
  await expect(carriedToggle.locator("i")).toHaveClass(/fa-check/);
  const equippedToggle = leatherRow.locator('[data-action="toggleItemEquipped"]');
  await expect(equippedToggle).toHaveAttribute("aria-pressed", "false");
  await expect(equippedToggle.locator("i")).toHaveClass(/fa-times/);

  await carriedToggle.click();
  await expect(carriedToggle).toHaveAttribute("aria-pressed", "false");
  await expect
    .poll(async () =>
      page.evaluate(
        ({ actorId, itemId }) => {
          const actor = game.actors.get(actorId);
          const item = actor?.items.get(itemId);
          return (item?.system as { carried?: boolean } | undefined)?.carried;
        },
        { actorId, itemId: leatherArmorId },
      ),
    )
    .toBe(false);

  // Increase/decrease/gift stay visually present but inert; edit/duplicate/
  // delete are the only functional Commands in this wireframe pass.
  const commands = leatherRow.locator("td").last();
  await expect(commands.locator(".fa-plus")).toHaveAttribute("inert", "");
  await expect(commands.locator(".fa-minus")).toHaveAttribute("inert", "");
  await expect(commands.locator(".fa-gift")).toHaveAttribute("inert", "");
  await expect(commands.locator('[data-action="editItem"]')).toHaveCount(1);
  await expect(commands.locator('[data-action="duplicateItem"]')).toHaveCount(1);
  await expect(commands.locator('[data-action="deleteItem"]')).toHaveCount(1);
});

test("Item-type-less Inventory sections (Weapons, Equipment, Consumables, Miscellaneous, Containers) render their own localized empty state", async ({
  foundryPage: page,
}) => {
  const { actorId } = await resetFixtures(page);
  const sheetId = await openPcSheet(page, actorId);
  const sheet = page.locator(`#${sheetId}`);
  await sheet.locator('[role="tab"][data-group="primary"][data-tab="inventory"]').click();

  for (const [region, message] of [
    ["Weapons", "No Weapons recorded yet."],
    ["Equipment", "No Equipment recorded yet."],
    ["Consumables", "No Consumables recorded yet."],
    ["Miscellaneous", "No Miscellaneous Items recorded yet."],
    ["Containers", "No Containers recorded yet."],
  ] as const) {
    await expect(sheet.getByRole("region", { name: region })).toContainText(message);
  }
});

test("the carrying-capacity section remains usable, without overflow, at representative sheet widths", async ({
  foundryPage: page,
}) => {
  const { actorId } = await resetFixtures(page);
  await updateActor(page, actorId, { "system.encumbrance": ENCUMBRANCE, "system.movement.mode": "swim" });
  const sheetId = await openPcSheet(page, actorId);
  const sheet = page.locator(`#${sheetId}`);
  await sheet.locator('[role="tab"][data-group="primary"][data-tab="inventory"]').click();

  const encumbranceSection = sheet.locator(".pc-inventory-encumbrance");
  for (const width of [1000, 720, 400]) {
    await resizePcSheet(page, sheetId, width);
    await expect(bandFills(sheet)).toHaveCount(4);
    const overflow = await encumbranceSection.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  }
});
