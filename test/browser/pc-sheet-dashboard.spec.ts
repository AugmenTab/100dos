// Lightweight-tier counterparts of 4 of the 6 originally-classified
// portable Dashboard tests. Two were reopened during implementation and
// kept in real-Foundry instead, per the handoff's own anticipated escape
// valve (section 4): "if a migrated test unexpectedly requires
// [reproducing meaningful logic] to preserve what it actually proves,
// move that test back to the real-Foundry suite."
//
//  - "Initiative, Luck, Wounds, Fatigue, and all six Damage Resistance
//    locations render stored schema values" — its DR left/right grouping
//    and sort-order assertion depends on a private context-preparation
//    computation (grouping system.dr by location type, sorting within
//    each group), not template logic. Hand-feeding pre-grouped,
//    pre-sorted data would make that specific assertion vacuous.
//  - "pinning an Ability surfaces it as a quick-use control..." and
//    "only active Effects appear in the active-Effects Dashboard region"
//    — "only active" is itself a private filtering computation
//    (this.actor.items -> active-only rows), not something the template
//    does. Both stay real-Foundry (the first was already non-portable —
//    ApplicationV2 action dispatch).
//
// Also excluded for the same reason: "pinned Skills and pinned Educations
// render as two separate alphabetized clusters" (already correctly
// classified non-portable — alphabetizing is private computation too).
import { expect, test } from "@playwright/test";
import { buildDashboardContext, buildDrCategories, type DrLocationFixture } from "./support/dashboard-context.js";
import { renderPage } from "./support/render.js";

const CHARACTERISTIC_IDS = ["str", "tou", "agi", "wfr", "wfm", "int", "per", "crg", "cha", "ldr"];

const HUMANOID_DR_LOCATIONS: DrLocationFixture[] = [
  { key: "head", type: "head", label: "Head", value: 8 },
  { key: "torso", type: "torso", label: "Torso", value: 12 },
  { key: "leftArm", type: "arm", label: "Left Arm", value: 9 },
  { key: "rightArm", type: "arm", label: "Right Arm", value: 11, destroyed: true },
  { key: "leftLeg", type: "leg", label: "Left Leg", value: 9 },
  { key: "rightLeg", type: "leg", label: "Right Leg", value: 9 },
];

test("Dashboard renders identity, resources, Characteristics, DR, and dynamic collections from real schema-backed Actor data", async ({
  page,
}) => {
  // The original test's trailing name-fill-and-persist check is not
  // reproduced here — that's Foundry form-submit persistence, and it's
  // already independently covered by system-smoke.spec.ts's "PC name
  // persists through the sheet" test.
  const html = renderPage("actors/pc/dashboard.hbs", buildDashboardContext({ drCategories: buildDrCategories(HUMANOID_DR_LOCATIONS) }), { wrapperClass: "pc-sheet-body" });
  await page.setContent(html);

  await expect(page.locator(".pc-dashboard-portrait")).toBeVisible();
  const nameInput = page.locator('input[name="name"]');
  await expect(nameInput).toHaveValue("[Browser] PC");

  await expect(page.locator('select[name="system.archetype"]')).toHaveCount(0);
  await expect(page.locator('.pc-dashboard-archetype-row a[role="button"]')).toBeVisible();

  await expect(page.getByRole("group", { name: "Initiative" })).toContainText("0");

  const luckGroup = page.getByRole("group", { name: "Luck" });
  await expect(luckGroup.locator('input[name="system.luck.value"]')).toHaveValue("0");
  await expect(luckGroup).toContainText("0");

  const woundsGroup = page.getByRole("group", { name: "Wounds" });
  await expect(woundsGroup.locator('input[name="system.wounds.value"]')).toHaveValue("0");
  await expect(woundsGroup.locator('input[name="system.wounds.temp"]')).toHaveValue("0");
  await expect(woundsGroup).toContainText("0");

  const fatigueGroup = page.getByRole("group", { name: "Fatigue" });
  await expect(fatigueGroup.locator('input[name="system.fatigue.value"]')).toHaveValue("0");
  await expect(fatigueGroup).toContainText("0");

  await expect(page.locator("[data-dr-location-id]")).toHaveCount(HUMANOID_DR_LOCATIONS.length);
  for (const loc of HUMANOID_DR_LOCATIONS) {
    await expect(page.locator(`[data-dr-location-id="${loc.key}"]`)).toBeVisible();
  }

  await expect(page.locator(".pc-dashboard-quick-use .pc-dashboard-empty-state")).toBeVisible();
  await expect(page.locator(".pc-dashboard-pinned-skills .pc-dashboard-empty-state")).toBeVisible();
  await expect(page.locator(".pc-dashboard-effects .pc-dashboard-empty-state")).toBeVisible();
});

test("all ten Characteristics render in order with accessible names and editable, independent temporary modifiers", async ({
  page,
}) => {
  // The original test's temp-input fill-and-persist check is not
  // reproduced here — that's Foundry form-submit persistence.
  const html = renderPage("actors/pc/dashboard.hbs", buildDashboardContext(), { wrapperClass: "pc-sheet-body" });
  await page.setContent(html);

  const tiles = page.locator("[data-characteristic-id]");
  await expect(tiles).toHaveCount(CHARACTERISTIC_IDS.length);
  const tileIds = await tiles.evaluateAll((els) => els.map((el) => el.getAttribute("data-characteristic-id")));
  expect(tileIds).toEqual(CHARACTERISTIC_IDS);

  for (const id of CHARACTERISTIC_IDS) {
    const tile = page.locator(`[data-characteristic-id="${id}"]`);
    await expect(tile).toHaveAttribute("role", "group");
    await expect(tile).toHaveAttribute("aria-label", /.+/);
    await expect(tile.locator(`input[name="system.characteristics.${id}.temp"]`)).toBeEnabled();
  }

  await page.setViewportSize({ width: 900, height: 2000 });
  const boxes = await tiles.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
  expect(new Set(boxes).size).toBe(1);
});

test("Movement speeds accept decimal values, stored at full precision but displayed rounded to 2 places without padding whole numbers", async ({
  page,
}) => {
  const html = renderPage(
    "actors/pc/dashboard.hbs",
    buildDashboardContext({
      actor: {
        system: {
          movement: {
            mode: "land",
            base: {
              half: { value: 4.256, contributions: [] },
              full: { value: 8, contributions: [] },
              charge: { value: 8.5, contributions: [] },
              run: { value: 12.1, contributions: [] },
              climb: { value: 3.75, contributions: [] },
              jump: { value: 0, contributions: [] },
              leap: { value: 0, contributions: [] },
              swim: { full: { value: 0, contributions: [] } },
              sprint: null,
            },
          },
        },
      },
    }),
    { wrapperClass: "pc-sheet-body" },
  );
  await page.setContent(html);

  const movementSection = page.getByRole("region", { name: "Movement" });
  const speedRow = movementSection.locator('[data-tooltip-html*="Half"]').locator("..");
  await expect(speedRow).toHaveText("4.26 / 8 / 8.5 / 12.1");

  const climbRow = movementSection.locator('[data-tooltip-html*="Climb"]');
  await expect(climbRow).toHaveText("3.75");
});

// "Dashboard remains usable, without overlap or overflow, at
// representative sheet widths" was NOT migrated, despite being in the
// original 34-test classification. Attempted directly: even with the
// .pc-sheet-body wrapper (needed for the Characteristics grid CSS to
// apply at all — see buildDashboardContext usage above), the bare render
// showed a real, unexplained ~12px horizontal overflow against the
// original test's 4px tolerance (itself calibrated specifically for known
// CSS Grid sub-pixel rounding, not a general-purpose margin). That gap
// traces to the outer window-chrome context this harness deliberately
// doesn't reproduce (see render.ts) — Dashboard's overflow CSS turned out
// to depend on more of that chrome than Ability's did (whose equivalent
// overflow test migrated cleanly with no chrome-fidelity issues at all).
// Chasing pixel-perfect chrome fidelity here would mean growing the
// harness well past "narrow adapter," so this test stays real-Foundry.
