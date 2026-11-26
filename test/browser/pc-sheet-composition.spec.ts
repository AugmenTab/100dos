// Browser-tier coverage for the PC sheet's character-composition surfaces:
// the Dashboard's independent Race and Soldier Type selectors, and the
// Features tab's Template section. Selecting, creating, and toggling are
// Foundry-dependent and covered in e2e.
import { expect, test } from "@playwright/test";
import { buildDashboardContext } from "./support/dashboard-context.js";
import { renderPage } from "./support/render.js";

test("the Dashboard has independent Race and Soldier Type selectors, each with None and an Add control", async ({ page }) => {
  const html = renderPage(
    "actors/pc/dashboard.hbs",
    buildDashboardContext({
      races: [
        { id: "elf", name: "Elf" },
        { id: "human", name: "Human", active: true, img: "icons/svg/human.svg" },
      ],
      soldierTypes: [{ id: "marine", name: "Marine" }],
    }),
    { wrapperClass: "pc-sheet-body" },
  );
  await page.setContent(html);

  const race = page.locator('select[data-composition-select="race"]');
  await expect(race.locator("option")).toHaveText(["None", "Elf", "Human"]);
  await expect(race.locator("option:checked")).toHaveText("Human");
  await expect(race).not.toHaveAttribute("name", /.+/);
  await expect(page.getByLabel("Race", { exact: true })).toBeVisible();
  await expect(page.locator('[data-composition-type="race"] img')).toHaveAttribute("src", "icons/svg/human.svg");

  const soldierType = page.locator('select[data-composition-select="soldierType"]');
  await expect(soldierType.locator("option")).toHaveText(["None", "Marine"]);
  await expect(soldierType.locator("option:checked")).toHaveText("None");
  await expect(page.locator('[data-composition-type="soldierType"] img')).toHaveCount(0);

  await expect(page.locator('button[data-action="createOwnedItem"][data-type="race"]')).toHaveAttribute("aria-label", "Add Race");
  await expect(page.locator('button[data-action="createOwnedItem"][data-type="soldierType"]')).toHaveAttribute("aria-label", "Add Soldier Type");
});

test("with nothing owned, both selectors offer only None", async ({ page }) => {
  await page.setContent(renderPage("actors/pc/dashboard.hbs", buildDashboardContext(), { wrapperClass: "pc-sheet-body" }));
  await expect(page.locator('select[data-composition-select="race"] option')).toHaveText(["None"]);
  await expect(page.locator('select[data-composition-select="soldierType"] option')).toHaveText(["None"]);
});

type FeatureRow = { item: { id: string; name: string; img: string; system: { active: boolean } }; hasActions: boolean; uses: null };

function featuresContext(templateItems: FeatureRow[]) {
  return {
    tabs: { primary: { features: { active: true } } },
    sheetId: "browser-tier-sheet",
    templateItems,
    abilityItems: [],
    traitItems: [],
    miscellaneousItems: [],
  };
}

const FEATURE_PARTIALS = ["actors/pc/features/row.hbs"];

test("the Features Templates section lists Templates with an Active toggle each and a wired Add control", async ({ page }) => {
  const rows: FeatureRow[] = [
    { item: { id: "vet", name: "Veteran", img: "icons/svg/item-bag.svg", system: { active: true } }, hasActions: false, uses: null },
    { item: { id: "zom", name: "Zombie", img: "icons/svg/item-bag.svg", system: { active: false } }, hasActions: false, uses: null },
  ];
  await page.setContent(renderPage("actors/pc/features.hbs", featuresContext(rows), { partials: FEATURE_PARTIALS, wrapperClass: "pc-sheet-body" }));

  const templates = page.getByRole("region", { name: "Templates" });
  await expect(templates.locator("tbody tr")).toHaveCount(2);
  await expect(templates.getByLabel("Toggle Veteran active")).toBeChecked();
  await expect(templates.getByLabel("Toggle Zombie active")).not.toBeChecked();
  await expect(templates.locator('input[data-action="toggleItemActive"][data-item-id="zom"]')).toHaveCount(1);
  await expect(templates.locator("tbody tr").nth(1).locator(".depleted")).toHaveText("Zombie");
  await expect(templates.locator('button[data-action="createOwnedItem"][data-type="template"]')).toHaveAttribute("aria-label", "Add Template");

  // The Active toggle is Template-only; the other Feature tables are unchanged.
  await expect(page.locator('input[data-action="toggleItemActive"]')).toHaveCount(2);
});

test("an empty Templates section keeps its empty state", async ({ page }) => {
  await page.setContent(renderPage("actors/pc/features.hbs", featuresContext([]), { partials: FEATURE_PARTIALS, wrapperClass: "pc-sheet-body" }));
  await expect(page.getByRole("region", { name: "Templates" }).locator(".dense-table-empty-state")).toHaveText("No Templates recorded yet.");
});
