// Lightweight-tier counterparts of 6 of the 10 originally-classified
// portable Ledgers tests (5 unique titles, since XP and Finances share
// identical test names in the real-Foundry file — see
// .local/analysis-foundry-dependency-classification.md's note on that).
// NOT migrated: "summary fields and ledger rows render from schema data;
// an unresolved recorder falls back to a neutral label" (both XP and
// Finances versions) — recordedByName is a precomputed fallback
// resolution (see support/ledgers-context.ts), a private computation this
// harness doesn't reproduce; hand-feeding an already-resolved value would
// make the fallback assertion vacuous. Both stay real-Foundry.
import { expect, test } from "@playwright/test";
import { buildFinancesContext, buildXpContext } from "./support/ledgers-context.js";
import { renderPage } from "./support/render.js";

function renderXp(overrides: Parameters<typeof buildXpContext>[0] = {}): string {
  return renderPage("actors/pc/record/xp.hbs", buildXpContext(overrides), { wrapperClass: "pc-sheet-body" });
}

function renderFinances(overrides: Parameters<typeof buildFinancesContext>[0] = {}): string {
  return renderPage("actors/pc/record/finances.hbs", buildFinancesContext(overrides), { wrapperClass: "pc-sheet-body" });
}

test.describe("XP ledger page", () => {
  test("the action column has no textual header and carries labeled Add/Delete icon controls", async ({ page }) => {
    await page.setContent(renderXp({ xpLedger: [{ type: "purchase", description: "Strength Advancement", value: 50 }] }));

    const actionHeader = page.locator("thead th").last();
    await expect(actionHeader).toHaveText("");
    await expect(actionHeader.locator('a[role="button"]')).toHaveAttribute("aria-label", "Add XP Transaction");

    const deleteControl = page.locator("tbody tr").first().locator('a[role="button"]');
    await expect(deleteControl).toHaveAttribute("aria-label", "Delete transaction: Strength Advancement");
  });

  test("an empty ledger still shows the summary, headings, Add control, and an intentional empty state", async ({ page }) => {
    await page.setContent(renderXp());

    await expect(page.locator(".simple-stat-table")).toBeVisible();
    await expect(page.locator('thead a[role="button"]')).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.locator(".ledger-table-empty-state")).toHaveText("No XP transactions recorded yet.");
  });
});

test.describe("Finances ledger page", () => {
  test("the action column has no textual header and carries labeled Add/Delete icon controls", async ({ page }) => {
    await page.setContent(renderFinances({ financesLedger: [{ type: "purchase", description: "Battle Rifle", value: 600 }] }));

    const actionHeader = page.locator("thead th").last();
    await expect(actionHeader).toHaveText("");
    await expect(actionHeader.locator('a[role="button"]')).toHaveAttribute("aria-label", "Add Finance Transaction");

    const deleteControl = page.locator("tbody tr").first().locator('a[role="button"]');
    await expect(deleteControl).toHaveAttribute("aria-label", "Delete transaction: Battle Rifle");
  });

  test("an empty ledger still shows the summary, headings, Add control, and an intentional empty state", async ({ page }) => {
    await page.setContent(renderFinances());

    await expect(page.locator(".simple-stat-table")).toBeVisible();
    await expect(page.locator('thead a[role="button"]')).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.locator(".ledger-table-empty-state")).toHaveText("No finance transactions recorded yet.");
  });

  test("values render as locale-formatted numbers with no currency symbol", async ({ page }) => {
    await page.setContent(renderFinances({ financesLedger: [{ type: "income", description: "Payment", value: 2500000 }] }));
    await expect(page.locator("tbody tr").first().locator("td.ledger-table-value")).toHaveText("2,500,000");
  });
});

test("XP and Finances ledgers remain usable, without whole-sheet overflow, at representative sheet widths", async ({ page }) => {
  const xpRow = { type: "reward", description: "Completed Investigation", value: 100 };
  const financesRow = { type: "income", description: "Mission Payment", value: 1000 };

  for (const width of [1000, 720, 360]) {
    for (const [html] of [
      [renderXp({ xpLedger: [xpRow] })],
      [renderFinances({ financesLedger: [financesRow] })],
    ]) {
      await page.setContent(html);
      await page.setViewportSize({ width, height: 2000 });
      const wrapBox = await page.locator(".ledger-table-wrap").boundingBox();
      expect(wrapBox).not.toBeNull();
      expect(wrapBox!.width).toBeLessThanOrEqual(width + 1);
    }
  }
});
