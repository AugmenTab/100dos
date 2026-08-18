import { expect, test } from "./support/diagnostics.js";
import { resetFixtures } from "./support/fixtures.js";
import { ensureGameView } from "./support/foundry-session.js";
import { openPcSheet, rerenderPcSheet, resizePcSheet } from "./support/pc-sheet.js";
import { type Page } from "@playwright/test";

const CHARACTERISTIC_IDS = ["str", "tou", "agi", "wfr", "wfm", "int", "per", "crg", "cha", "ldr"];

// system.dr is a keyed collection of arbitrary locations (see
// .local/plan.md), empty by default — nothing assumes a humanoid shape at
// the schema level. This is a representative humanoid set for tests that
// need real DR data to render against; rightArm is destroyed to exercise
// that state. Object literal (not per-field dot-paths): a location's
// required fields (type/label/placement/order/destroyed) have their own
// schema defaults, so a dot-path dr.leftArm.value update silently backfills
// leftArm's type to the schema default ("head") instead of leaving it
// unset — passing an assertion that only checks the value text exists
// somewhere on the page, while actually miscategorizing the location.
const HUMANOID_DR = {
  head: { type: "head", label: "Head", placement: "none", order: 0, destroyed: false, value: 8, contributions: [] },
  torso: { type: "torso", label: "Torso", placement: "none", order: 0, destroyed: false, value: 12, contributions: [] },
  leftArm: { type: "arm", label: "Left Arm", placement: "left", order: 0, destroyed: false, value: 9, contributions: [] },
  rightArm: { type: "arm", label: "Right Arm", placement: "right", order: 0, destroyed: true, value: 11, contributions: [] },
  leftLeg: { type: "leg", label: "Left Leg", placement: "left", order: 0, destroyed: false, value: 9, contributions: [] },
  rightLeg: { type: "leg", label: "Right Leg", placement: "right", order: 0, destroyed: false, value: 9, contributions: [] },
};
const DR_LOCATION_IDS = Object.keys(HUMANOID_DR);

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

async function getSystemValue(page: Page, actorId: string, path: string): Promise<unknown> {
  return page.evaluate(
    ({ actorId, path }) => {
      const actor = game.actors.get(actorId);
      if (!actor) throw new Error(`Fixture actor ${actorId} not found.`);
      return path.split(".").reduce<unknown>((value, key) => (value as Record<string, unknown>)?.[key], actor.system);
    },
    { actorId, path },
  );
}

test.beforeEach(async ({ page, baseURL }) => {
  await page.goto(baseURL ?? "/");
  await ensureGameView(page);
});

test("Dashboard renders identity, resources, Characteristics, DR, and dynamic collections from real schema-backed Actor data", async ({
  page,
}) => {
  const { actorId } = await resetFixtures(page);
  await updateActor(page, actorId, { "system.dr": HUMANOID_DR });
  const sheetId = await openPcSheet(page, actorId);
  const sheet = page.locator(`#${sheetId}`);

  await expect(sheet.locator(".pc-dashboard-portrait")).toBeVisible();
  const nameInput = sheet.locator('input[name="name"]');
  await expect(nameInput).toHaveValue("[E2E] PC");

  // No Archetype Item type exists yet, so selectedArchetype is always null
  // and the Dashboard falls to the "add an Archetype" branch, not a select.
  await expect(sheet.locator('select[name="system.archetype"]')).toHaveCount(0);
  await expect(sheet.locator(".pc-dashboard-archetype-row a[role=\"button\"]")).toBeVisible();

  // Current/Temp fields are <input>s — their value never appears in
  // textContent, so they're checked separately from the tooltip-rendered
  // Maximum values (real text nodes, safe for toContainText).
  await expect(sheet.getByRole("group", { name: "Initiative" })).toContainText("0");

  const luckGroup = sheet.getByRole("group", { name: "Luck" });
  await expect(luckGroup.locator('input[name="system.luck.value"]')).toHaveValue("0");
  await expect(luckGroup).toContainText("0");

  const woundsGroup = sheet.getByRole("group", { name: "Wounds" });
  await expect(woundsGroup.locator('input[name="system.wounds.value"]')).toHaveValue("0");
  await expect(woundsGroup.locator('input[name="system.wounds.temp"]')).toHaveValue("0");
  await expect(woundsGroup).toContainText("0");

  const fatigueGroup = sheet.getByRole("group", { name: "Fatigue" });
  await expect(fatigueGroup.locator('input[name="system.fatigue.value"]')).toHaveValue("0");
  await expect(fatigueGroup).toContainText("0");

  await expect(sheet.locator("[data-dr-location-id]")).toHaveCount(DR_LOCATION_IDS.length);
  for (const id of DR_LOCATION_IDS) {
    await expect(sheet.locator(`[data-dr-location-id="${id}"]`)).toBeVisible();
  }

  await expect(sheet.locator(".pc-dashboard-quick-use .pc-dashboard-empty-state")).toBeVisible();
  await expect(sheet.locator(".pc-dashboard-pinned-skills .pc-dashboard-empty-state")).toBeVisible();
  await expect(sheet.locator(".pc-dashboard-effects .pc-dashboard-empty-state")).toBeVisible();

  await nameInput.fill("[E2E] PC Dashboard Renamed");
  await nameInput.blur();
  await expect
    .poll(async () => page.evaluate((id) => game.actors.get(id)?.name, actorId))
    .toBe("[E2E] PC Dashboard Renamed");
});

test("all ten Characteristics render in order with accessible names and editable, independent temporary modifiers", async ({
  page,
}) => {
  const { actorId } = await resetFixtures(page);
  const sheetId = await openPcSheet(page, actorId);
  const sheet = page.locator(`#${sheetId}`);

  const tiles = sheet.locator("[data-characteristic-id]");
  await expect(tiles).toHaveCount(CHARACTERISTIC_IDS.length);
  const tileIds = await tiles.evaluateAll((els) => els.map((el) => el.getAttribute("data-characteristic-id")));
  expect(tileIds).toEqual(CHARACTERISTIC_IDS);

  for (const id of CHARACTERISTIC_IDS) {
    const tile = sheet.locator(`[data-characteristic-id="${id}"]`);
    await expect(tile).toHaveAttribute("role", "group");
    await expect(tile).toHaveAttribute("aria-label", /.+/);
    await expect(tile.locator(`input[name="system.characteristics.${id}.temp"]`)).toBeEnabled();
  }

  const strInput = sheet.locator('input[name="system.characteristics.str.temp"]');
  await strInput.fill("2");
  await strInput.blur();

  await expect.poll(async () => getSystemValue(page, actorId, "characteristics.str.temp")).toBe(2);
  expect(await getSystemValue(page, actorId, "characteristics.str.value")).toBe(0);
  expect(await getSystemValue(page, actorId, "characteristics.str.mod.value")).toBe(0);

  await resizePcSheet(page, sheetId, 900);
  const boxes = await tiles.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
  expect(new Set(boxes).size).toBe(1);
});

test("the contribution tooltip presents stored Contributions in order with correctly signed values, and still appears (empty) when the collection is empty", async ({
  page,
}) => {
  const { actorId } = await resetFixtures(page);
  await updateActor(page, actorId, {
    "system.characteristics.str.value": 63,
    "system.characteristics.str.contributions": [
      { label: "Base", value: 15 },
      { label: "Human (Race)", value: 25 },
      { label: "Rookie", value: 5 },
      { label: "Laborer (Background)", value: 3 },
      { label: "Belt of Giant Strength (Item)", value: 5 },
      { label: "Rage (Effect)", value: 10 },
      { label: "Broken Arm", value: -20 },
    ],
  });
  const sheetId = await openPcSheet(page, actorId);
  const sheet = page.locator(`#${sheetId}`);

  // Foundry's native TooltipManager (game.tooltip) only activates on real
  // pointer hover — not focus — so this exercises the actual mechanism
  // rather than a keyboard-accessible substitute; that's an accepted
  // limitation shared with the rest of Foundry's own core UI.
  const strButton = sheet.locator('[data-characteristic-id="str"] button');
  await expect(strButton).toHaveText("63");

  const tooltip = page.locator("#tooltip");
  await expect(tooltip).not.toHaveClass(/active/);

  await strButton.hover();
  await expect(tooltip).toHaveClass(/active/, { timeout: 3000 });
  const labels = await tooltip.locator(".dos100-tooltip-row-label").allTextContents();
  const values = await tooltip.locator(".dos100-tooltip-row-value").allTextContents();
  expect(labels).toEqual([
    "Base",
    "Human (Race)",
    "Rookie",
    "Laborer (Background)",
    "Belt of Giant Strength (Item)",
    "Rage (Effect)",
    "Broken Arm",
  ]);
  expect(values.map(Number)).toEqual([15, 25, 5, 3, 5, 10, -20]);

  // Every value carries a tooltip unconditionally, even with zero
  // Contributions — an empty breakdown (header, no rows) is the visible
  // signal that a value's calculation has a bug, rather than silently
  // hiding the tooltip.
  const touButton = sheet.locator('[data-characteristic-id="tou"] button');
  await expect(touButton).toHaveText("0");
  await expect(touButton).toHaveAttribute("data-tooltip-html", /.+/);
  await touButton.hover();
  await expect(tooltip).toHaveClass(/active/, { timeout: 3000 });
  await expect(tooltip.locator(".dos100-tooltip-row")).toHaveCount(0);
});

test("Initiative, Luck, Wounds, Fatigue, and all six Damage Resistance locations render stored schema values", async ({
  page,
}) => {
  const { actorId } = await resetFixtures(page);
  await updateActor(page, actorId, {
    "system.initiative.value": 5,
    "system.luck": { value: 2, max: 3 },
    "system.wounds": { value: 8, max: 10 },
    "system.fatigue": { value: 1, max: 5 },
    "system.dr": HUMANOID_DR,
  });
  const sheetId = await openPcSheet(page, actorId);
  const sheet = page.locator(`#${sheetId}`);

  await expect(sheet.getByRole("group", { name: "Initiative" })).toContainText("5");

  const luckGroup = sheet.getByRole("group", { name: "Luck" });
  await expect(luckGroup.locator('input[name="system.luck.value"]')).toHaveValue("2");
  await expect(luckGroup).toContainText("3");

  const woundsGroup = sheet.getByRole("group", { name: "Wounds" });
  await expect(woundsGroup.locator('input[name="system.wounds.value"]')).toHaveValue("8");
  await expect(woundsGroup).toContainText("10");

  const fatigueGroup = sheet.getByRole("group", { name: "Fatigue" });
  await expect(fatigueGroup.locator('input[name="system.fatigue.value"]')).toHaveValue("1");
  await expect(fatigueGroup).toContainText("5");

  for (const [id, location] of Object.entries(HUMANOID_DR)) {
    await expect(sheet.locator(`[data-dr-location-id="${id}"]`)).toHaveText(String(location.value));
  }

  // Left/right pairs land in the same category cell, sorted left before
  // right — not one column per location.
  const armCategory = sheet.locator('[data-dr-location-id="leftArm"]').locator("..");
  const armLocationIds = await armCategory
    .locator("[data-dr-location-id]")
    .evaluateAll((els) => els.map((el) => el.getAttribute("data-dr-location-id")));
  expect(armLocationIds).toEqual(["leftArm", "rightArm"]);

  // Destroyed locations stay visible (never deleted) but read struck out.
  await expect(sheet.locator('[data-dr-location-id="rightArm"]')).toHaveClass(/destroyed/);
  await expect(sheet.locator('[data-dr-location-id="leftArm"]')).not.toHaveClass(/destroyed/);

  // WING and TAIL have no locations in this seed data — their category
  // cells shouldn't render at all.
  const drSection = sheet.locator(".pc-dashboard-dr-movement-row");
  await expect(drSection).not.toContainText("Wing");
  await expect(drSection).not.toContainText("Tail");
});

test("pinning an Ability surfaces it as a quick-use control that delegates to the existing Action-use path", async ({
  page,
}) => {
  const { actorId, itemId } = await resetFixtures(page);
  const sheetId = await openPcSheet(page, actorId);
  const sheet = page.locator(`#${sheetId}`);

  await expect(sheet.locator(".pc-dashboard-quick-use-item")).toHaveCount(0);

  await page.evaluate(
    async ({ actorId, itemId }) => {
      const actor = game.actors.get(actorId);
      const item = actor?.items.get(itemId);
      if (!item) throw new Error(`Fixture ability ${itemId} not found.`);
      await item.update({
        "system.pinned": true,
        "system.actions.items": {
          action1: {
            id: "action1",
            name: "Test Action",
            activation: { type: "free", cost: null },
            uses: { per: "encounter", value: 1, max: 1, cost: 1, formula: { max: "", cost: "" } },
          },
        },
      });
    },
    { actorId, itemId },
  );
  await rerenderPcSheet(page, actorId);

  const control = sheet.locator(".pc-dashboard-quick-use-item");
  await expect(control).toHaveCount(1);
  await expect(control).toHaveAttribute("aria-label", "[E2E] Ability");

  await control.click();

  await expect
    .poll(async () =>
      page.evaluate(
        ({ actorId, itemId }) => {
          const actor = game.actors.get(actorId);
          const item = actor?.items.get(itemId);
          const items = item?.system.actions as { items: Record<string, { uses: { value: number } }> };
          return items?.items.action1?.uses.value;
        },
        { actorId, itemId },
      ),
    )
    .toBe(0);
});

test("pinned Skills and pinned Educations render as two separate alphabetized clusters, not merged, in the Dashboard's Pinned Skills & Educations region", async ({
  page,
}) => {
  const { actorId } = await resetFixtures(page);
  const sheet = page.locator(`#${await openPcSheet(page, actorId)}`);
  await expect(sheet.locator(".pc-dashboard-pinned-skills .pc-dashboard-empty-state")).toBeVisible();

  await page.evaluate(async (actorId) => {
    const actor = game.actors.get(actorId);
    await actor?.update({
      "system.skills": {
        pilotGround: {
          name: "Pilot (Ground)",
          difficulty: "advanced",
          type: ["fieldcraft"],
          training: "plus10",
          characteristic: "agi",
          characteristics: ["agi"],
          value: 62,
          pinned: true,
          description: "",
          contributions: [],
        },
        athletics: {
          name: "Athletics",
          difficulty: "basic",
          type: ["movement"],
          training: "none",
          characteristic: "agi",
          characteristics: ["agi"],
          value: 30,
          pinned: true,
          description: "",
          contributions: [],
        },
      },
      "system.educations": {
        engineering: {
          name: "Engineering",
          difficulty: "advanced",
          training: "plus10",
          selected: "int",
          options: ["int"],
          value: 55,
          pinned: true,
          description: "",
          contributions: [],
        },
      },
    });
  }, actorId);
  await rerenderPcSheet(page, actorId);

  await expect(sheet.locator(".pc-dashboard-pinned-skills .pc-dashboard-empty-state")).toHaveCount(0);

  const lists = sheet.locator(".pc-dashboard-pinned-skills-list");
  await expect(lists).toHaveCount(2);
  await expect(lists.nth(0).locator("li")).toHaveText(["Athletics", "Pilot (Ground)"]);
  await expect(lists.nth(1).locator("li")).toHaveText(["Engineering"]);
});

test("only active Effects appear in the active-Effects Dashboard region", async ({ page }) => {
  const { actorId } = await resetFixtures(page);
  await page.evaluate(async (actorId) => {
    const actor = game.actors.get(actorId);
    if (!actor) throw new Error(`Fixture actor ${actorId} not found.`);
    await actor.createEmbeddedDocuments("Item", [
      { name: "[E2E] Active Effect", type: "effect", system: { active: true } },
      { name: "[E2E] Inactive Effect", type: "effect", system: { active: false } },
    ]);
  }, actorId);
  const sheetId = await openPcSheet(page, actorId);
  const sheet = page.locator(`#${sheetId}`);

  const effectsList = sheet.locator(".pc-dashboard-effects-list");
  await expect(effectsList.locator("li")).toHaveCount(1);
  await expect(effectsList).toContainText("[E2E] Active Effect");
  await expect(effectsList).not.toContainText("[E2E] Inactive Effect");
});

test("Dashboard remains usable, without overlap or overflow, at representative sheet widths", async ({ page }) => {
  const { actorId } = await resetFixtures(page);
  // DR is empty by default now — seed it so the DR/Movement row (whose
  // content, not just presence, matters for overflow testing) has
  // something to actually wrap/overflow-check against.
  await updateActor(page, actorId, { "system.dr": HUMANOID_DR });
  const sheetId = await openPcSheet(page, actorId);
  const sheet = page.locator(`#${sheetId}`);
  const dashboard = sheet.locator(".pc-dashboard");

  const widths = [900, 720, 360];
  for (const width of widths) {
    await resizePcSheet(page, sheetId, width);

    const characteristicIds = await sheet
      .locator("[data-characteristic-id]")
      .evaluateAll((els) => els.map((el) => el.getAttribute("data-characteristic-id")));
    expect(characteristicIds).toEqual(CHARACTERISTIC_IDS);

    await expect(sheet.locator("[data-dr-location-id]")).toHaveCount(DR_LOCATION_IDS.length);
    for (const id of DR_LOCATION_IDS) {
      await expect(sheet.locator(`[data-dr-location-id="${id}"]`)).toBeVisible();
    }

    // .pc-dashboard-characteristics-grid uses `repeat(auto-fit, minmax(4rem,
    // max-content))` + `justify-content: space-between` — a combination
    // that can round a column's computed width down by a couple of px
    // relative to its actual (fractional) content width. Confirmed via
    // direct measurement at 720px: the TEMP+input modifier row is the
    // offender, and the input itself renders at exactly its intended
    // 2.35rem — nothing is actually oversized, it's sub-pixel Grid
    // rounding. Tolerating a few px here rather than restructuring the
    // Characteristics grid's sizing strategy, which is its own concept and
    // was deliberately left out of the Dashboard's CSS cleanup pass.
    const overflow = await dashboard.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(4);

    if (width === 900) {
      const tops = await sheet
        .locator("[data-characteristic-id]")
        .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
      expect(new Set(tops).size).toBe(1);
    }
  }
});
