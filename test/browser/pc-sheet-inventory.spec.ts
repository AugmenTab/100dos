// Lightweight-tier counterparts of all 4 originally-classified portable
// Inventory tests — the only Inventory group where every candidate
// survived implementation-time scrutiny unchanged. "Armor rows render
// Carried/Equipped toggles..." (data-action dispatch + persistence) stays
// real-Foundry, as already classified.
import { expect, test } from "@playwright/test";
import { buildInventoryContext } from "./support/inventory-context.js";
import { renderPage } from "./support/render.js";

const PARTIALS = [
  "actors/pc/inventory/table-with-actions.hbs",
  "actors/pc/inventory/table-with-slot.hbs",
  "actors/pc/inventory/table-simple.hbs",
];

function renderInventory(overrides: Parameters<typeof buildInventoryContext>[0] = {}): string {
  return renderPage("actors/pc/inventory.hbs", buildInventoryContext(overrides), { partials: PARTIALS, wrapperClass: "pc-sheet-body" });
}

test("the carrying-capacity Top Summary and Bottom Reference render stored Encumbrance/Finances data", async ({ page }) => {
  await page.setContent(
    renderInventory({
      encumbrance: { carried: 45, felt: 38, total: 127 },
      financesCarried: 1250,
      thresholds: { carry: 20, lift: 35, push: 60 },
    }),
  );

  const encumbranceSection = page.locator(".pc-inventory-encumbrance");
  await expect(encumbranceSection).toContainText("45 kgs");
  await expect(encumbranceSection).toContainText("38 kgs");
  await expect(encumbranceSection).toContainText("127 kgs");
  await expect(encumbranceSection).toContainText("1,250");

  await expect(encumbranceSection).toContainText("20 kgs");
  await expect(encumbranceSection).toContainText("35 kgs");
  await expect(encumbranceSection).toContainText("60 kgs");
  const liftCell = encumbranceSection.locator('[data-tooltip-html*="Lift"]');
  await expect(liftCell).toHaveAttribute("data-tooltip-html", /Base/);
});

test("fly renders no bars when the Actor has no Flight movement mode (thresholds.fly is null)", async ({ page }) => {
  await page.setContent(renderInventory({ encumbranceBands: [] }));
  await expect(page.locator(".pc-encumbrance-bar-fill")).toHaveCount(0);
});

test("Item-type-less Inventory sections (Weapons, Equipment, Consumables, Miscellaneous, Containers) render their own localized empty state", async ({
  page,
}) => {
  await page.setContent(renderInventory());

  for (const [region, message] of [
    ["Weapons", "No Weapons recorded yet."],
    ["Equipment", "No Equipment recorded yet."],
    ["Consumables", "No Consumables recorded yet."],
    ["Miscellaneous", "No Miscellaneous Items recorded yet."],
    ["Containers", "No Containers recorded yet."],
  ] as const) {
    await expect(page.getByRole("region", { name: region })).toContainText(message);
  }
});

test("the carrying-capacity section remains usable, without overflow, at representative sheet widths", async ({ page }) => {
  await page.setContent(
    renderInventory({
      encumbrance: { carried: 45, felt: 38, total: 127 },
      encumbranceBands: [
        { labelKey: "normal", thresholdValue: 10, fillPercent: 100 },
        { labelKey: "encumbered", thresholdValue: 20, fillPercent: 100 },
        { labelKey: "heavy", thresholdValue: 45, fillPercent: 72 },
        { labelKey: "maximumLoad", thresholdValue: 70, fillPercent: 0 },
      ],
    }),
  );

  const encumbranceSection = page.locator(".pc-inventory-encumbrance");
  for (const width of [1000, 720, 400]) {
    await page.setViewportSize({ width, height: 2000 });
    await expect(page.locator(".pc-encumbrance-bar-fill")).toHaveCount(4);
    const overflow = await encumbranceSection.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  }
});
