// Browser-tier coverage for the Template, Race, and Soldier Type Item
// sheets: the shared abstract shell, the Advances table, and the
// foundational-property editors' rendered states. Their click behavior
// (modals opening, persistence) is e2e; everything here is template output.
import { expect, test, type Page } from "@playwright/test";
import { buildCompositionContext, type CompositionItemFixture, type CompositionType } from "./support/composition-context.js";
import { renderPage } from "./support/render.js";
import { type BaseCharacteristics } from "../../src/module/base-characteristics.js";

const ITEM_SHELL_PARTIALS = [
  "items/item-header.hbs",
  "items/shell/description-tab.hbs",
  "items/shell/details-tab.hbs",
  "items/composition-details-fields.hbs",
  "items/shell/changes-tab.hbs",
  "items/shell/links-tab.hbs",
];

const LINEUP: BaseCharacteristics = { str: 30, tou: 35, agi: 0, wfr: 40, wfm: 25, int: 30, per: 30, crg: 45, cha: 20, ldr: 15 };

async function renderSheet(
  page: Page,
  type: CompositionType,
  fixture: CompositionItemFixture = {},
  tab: "description" | "details" | "changes" | "links" = "details",
) {
  await page.setContent(renderPage("items/shell/item-shell.hbs", buildCompositionContext(type, fixture, tab), { partials: ITEM_SHELL_PARTIALS }));
  return page.locator('.tab[data-group="primary"][data-tab="details"]');
}

test("all three sheets use the abstract shell with Description, Details, Changes, and Links tabs", async ({ page }) => {
  for (const [type, label] of [["template", "Template"], ["race", "Race"], ["soldierType", "Soldier Type"]] as const) {
    await renderSheet(page, type, {}, "description");
    await expect(page.locator(".dos100-item-sidebar .pc-section-heading")).toHaveText(label);
    await expect(page.locator('nav[data-group="primary"]').getByRole("tab")).toHaveText(["Description", "Details", "Changes", "Links"]);
    await expect(page.locator('input[name="system.active"]')).toBeVisible();
    await expect(page.locator('input[name="system.showInCombatTab"]')).toHaveCount(0);
  }
});

test("Template Details is the Advances table plus the shared sections, with no XP Cost or foundational editors", async ({ page }) => {
  const details = await renderSheet(page, "template");
  await expect(details.locator(".dos100-advances")).toBeVisible();
  await expect(details.locator('input[name="system.xpCost"]')).toHaveCount(0);
  await expect(details.locator(".dos100-base-characteristics, .dos100-base-mythic-characteristics, .dos100-base-size, .dos100-body-locations")).toHaveCount(0);
  await expect(details.locator(".dos100-item-advanced")).toBeVisible();
});

test("Race and Soldier Type expose XP Cost and every foundational editor", async ({ page }) => {
  for (const type of ["race", "soldierType"] as const) {
    const details = await renderSheet(page, type, { system: { xpCost: 250 } });
    const xp = details.locator('input[name="system.xpCost"]');
    await expect(xp).toHaveValue("250");
    await expect(xp).toHaveAttribute("type", "number");
    for (const section of [".dos100-advances", ".dos100-base-characteristics", ".dos100-base-mythic-characteristics", ".dos100-base-size", ".dos100-body-locations"]) {
      await expect(details.locator(section)).toBeVisible();
    }
  }
});

test("the Advances table lists nonzero entries with localized tiers, excludes used Characteristics, and binds levels", async ({ page }) => {
  const details = await renderSheet(page, "template", { system: { advances: { str: 1, tou: 2, per: 3 } } });
  const rows = details.locator(".dos100-advances tbody tr");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0).locator("select[data-advance-row] option:checked")).toHaveText("STR");
  await expect(rows.nth(1).locator('select[name="system.advances.tou"] option:checked')).toHaveText("Rookie");
  await expect(rows.nth(2).locator('select[name="system.advances.per"] option:checked')).toHaveText("Intermediate");
  await expect(rows.nth(0).locator('select[name="system.advances.str"] option')).toHaveText(["Simple", "Rookie", "Intermediate", "Proficient", "Mastery"]);

  const strCharacteristics = rows.nth(0).locator("select[data-advance-row] option");
  await expect(strCharacteristics).toHaveCount(8);
  await expect(strCharacteristics.filter({ hasText: /^TOU$/ })).toHaveCount(0);
  await expect(strCharacteristics.filter({ hasText: /^PER$/ })).toHaveCount(0);

  await expect(rows.nth(0).locator('button[data-action="deleteAdvance"]')).toHaveAttribute("data-characteristic", "str");
  await expect(details.locator('.dos100-advances button[data-action="addAdvance"]')).toBeVisible();
});

test("the Advances table shows an empty state, and hides Add once all ten Characteristics are used", async ({ page }) => {
  let details = await renderSheet(page, "template");
  await expect(details.locator(".dos100-advances .dense-table-empty-state")).toHaveText("No Characteristic Advances recorded yet.");

  details = await renderSheet(page, "race", {
    system: { advances: { str: 1, tou: 1, agi: 1, wfr: 1, wfm: 1, int: 1, per: 1, crg: 1, cha: 1, ldr: 1 } },
  });
  await expect(details.locator(".dos100-advances tbody tr")).toHaveCount(10);
  await expect(details.locator('button[data-action="addAdvance"]')).toHaveCount(0);
});

test("a Race's required Base Characteristics read as required until set, and can never be deleted", async ({ page }) => {
  let details = await renderSheet(page, "race");
  const table = details.locator(".dos100-base-characteristics");
  await expect(table).toContainText("Required, not yet set");
  await expect(table.locator('button[data-action="editBaseCharacteristics"]')).toHaveAttribute("aria-label", "Add Base Characteristics");
  await expect(table.locator('button[data-action="deleteBaseCharacteristics"]')).toHaveCount(0);

  details = await renderSheet(page, "race", { system: { baseCharacteristics: LINEUP } });
  await expect(details.locator(".dos100-base-characteristics thead th")).toHaveText(["STR", "TOU", "AGI", "WFR", "WFM", "INT", "PER", "CRG", "CHA", "LDR", ""]);
  await expect(details.locator('[data-base-characteristic="agi"]')).toHaveText("0");
  await expect(details.locator('[data-base-characteristic="crg"]')).toHaveText("45");
  await expect(details.locator('button[data-action="editBaseCharacteristics"]')).toHaveAttribute("aria-label", "Edit Base Characteristics");
  await expect(details.locator('button[data-action="deleteBaseCharacteristics"]')).toHaveCount(0);
});

test("a Soldier Type's Base Characteristics offer Add when absent, and Edit and Delete when set", async ({ page }) => {
  let details = await renderSheet(page, "soldierType");
  await expect(details.locator(".dos100-base-characteristics")).toContainText("Not supplied");
  await expect(details.locator('button[data-action="editBaseCharacteristics"]')).toHaveAttribute("aria-label", "Add Base Characteristics");
  await expect(details.locator('button[data-action="deleteBaseCharacteristics"]')).toHaveCount(0);

  details = await renderSheet(page, "soldierType", { system: { baseCharacteristics: LINEUP } });
  await expect(details.locator("[data-base-characteristic]")).toHaveCount(10);
  await expect(details.locator('button[data-action="editBaseCharacteristics"]')).toHaveAttribute("aria-label", "Edit Base Characteristics");
  await expect(details.locator('button[data-action="deleteBaseCharacteristics"]')).toBeVisible();
});

test("Base Mythic Characteristics show absence distinctly from zero, with Add/Edit/Delete states", async ({ page }) => {
  let details = await renderSheet(page, "race");
  await expect(details.locator(".dos100-base-mythic-characteristics")).toContainText("Not supplied");
  await expect(details.locator('button[data-action="editBaseMythicCharacteristics"]')).toHaveAttribute("aria-label", "Add Base Mythic Characteristics");
  await expect(details.locator('button[data-action="deleteBaseMythicCharacteristics"]')).toHaveCount(0);

  details = await renderSheet(page, "soldierType", { system: { baseMythicCharacteristics: { str: 2, tou: null, agi: 0 } } });
  await expect(details.locator('[data-base-mythic-characteristic="str"]')).toHaveText("2");
  await expect(details.locator('[data-base-mythic-characteristic="tou"]')).toHaveText("Absent");
  await expect(details.locator('[data-base-mythic-characteristic="tou"]')).toHaveClass(/dos100-absent/);
  await expect(details.locator('[data-base-mythic-characteristic="agi"]')).toHaveText("0");
  await expect(details.locator('[data-base-mythic-characteristic="agi"]')).not.toHaveClass(/dos100-absent/);
  await expect(details.locator('button[data-action="deleteBaseMythicCharacteristics"]')).toBeVisible();
});

test("Base Size is required on a Race and clearable on a Soldier Type", async ({ page }) => {
  let details = await renderSheet(page, "race");
  let select = details.locator('select[name="system.baseSize"]');
  await expect(select.locator("option:checked")).toHaveText("Normal");
  await expect(select.locator('option[value=""]')).toHaveCount(0);
  await expect(select.locator("option")).toHaveCount(14);

  details = await renderSheet(page, "soldierType");
  select = details.locator('select[name="system.baseSize"]');
  await expect(select.locator("option:checked")).toHaveText("Not supplied");
  await expect(select.locator('option[value=""]')).toHaveCount(1);

  details = await renderSheet(page, "soldierType", { system: { baseSize: "huge" } });
  await expect(details.locator('select[name="system.baseSize"] option:checked')).toHaveText("Huge");
});

test("Body Locations: a Race's empty anatomy is flagged, a Soldier Type's absent one reads Not supplied", async ({ page }) => {
  let details = await renderSheet(page, "race");
  const raceTable = details.locator(".dos100-body-locations");
  await expect(raceTable.locator(".dense-table-empty-state")).toHaveText("No Body Locations defined yet. A complete anatomy needs at least one.");
  await expect(raceTable.locator('button[data-action="addBodyLocation"]')).toBeVisible();
  await expect(raceTable.locator('button[data-action="removeBodyLocations"]')).toHaveCount(0);

  details = await renderSheet(page, "soldierType");
  await expect(details.locator(".dos100-body-locations .dense-table-empty-state")).toHaveText("Not supplied");
  await expect(details.locator('button[data-action="removeBodyLocations"]')).toHaveCount(0);
});

test("Body Locations render arbitrary non-humanoid anatomy in display order with per-row controls", async ({ page }) => {
  const details = await renderSheet(page, "soldierType", {
    system: {
      bodyLocations: {
        tail: { type: "tail", label: "Tail", placement: "none", order: 0 },
        rightWing: { type: "wing", label: "Right Wing", placement: "right", order: 0 },
        leftWing: { type: "wing", label: "Left Wing", placement: "left", order: 0 },
        rearTorso: { type: "torso", label: "Rear Torso", placement: "none", order: 1 },
        frontTorso: { type: "torso", label: "Front Torso", placement: "none", order: 0 },
        head2: { type: "head", label: "Right Head", placement: "right", order: 0 },
        head1: { type: "head", label: "Left Head", placement: "left", order: 0 },
      },
    },
  });
  const rows = details.locator(".dos100-body-locations tbody tr[data-body-location-id]");
  await expect(rows).toHaveCount(7);
  await expect(rows.locator("td:first-child")).toHaveText(["Left Head", "Right Head", "Front Torso", "Rear Torso", "Left Wing", "Right Wing", "Tail"]);
  await expect(rows.nth(4).locator("td")).toHaveText(["Left Wing", "Wing", "Left", "0", ""]);
  await expect(rows.nth(0).locator('button[data-action="editBodyLocation"]')).toHaveAttribute("data-identifier", "head1");
  await expect(rows.nth(0).locator('button[data-action="deleteBodyLocation"]')).toHaveAttribute("aria-label", "Delete Left Head");
  await expect(details.locator('button[data-action="removeBodyLocations"]')).toBeVisible();
});

test("the composition Details tab stays usable, without overflow, at representative sheet widths", async ({ page }) => {
  await renderSheet(page, "race", {
    system: {
      baseCharacteristics: LINEUP,
      baseMythicCharacteristics: { str: 2, tou: null, agi: 0 },
      advances: { str: 1, ldr: 5 },
      bodyLocations: { head: { type: "head", label: "Head", placement: "none", order: 0 } },
    },
  });
  // Same approach as the Ability shell's width test: the viewport stands in
  // for the app window's content width.
  for (const width of [640, 480, 360]) {
    await page.setViewportSize({ width, height: 900 });
    const shell = page.locator(".dos100-item-shell");
    await expect(shell).toBeVisible();
    const overflow = await shell.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(2);
  }
});
