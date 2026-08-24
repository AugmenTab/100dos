// Lightweight-tier counterparts of 6 of the 8 originally-classified
// portable Educations tests. Two were NOT migrated:
//  - "a Skill-identifier option with no matching Actor Skill falls back to
//    the raw identifier rather than being hidden or mutated" — the
//    fallback resolution (Skill identifier -> Actor Skill name, or the
//    raw identifier if no match) is a private context-preparation
//    computation, not template logic; hand-feeding an already-resolved
//    targetOptions list would make the assertion vacuous.
//  - "the record key is an Education's stable identity and is never
//    duplicated inside the persisted Education object" — a Document-
//    storage invariant, not a rendering concern (see the same note in
//    pc-sheet-skills.spec.ts for the analogous Skills test).
// Both stay real-Foundry.
import { expect, test } from "@playwright/test";
import { buildSkillsContext } from "./support/skills-context.js";
import { renderPage } from "./support/render.js";

function renderSkills(overrides: Parameters<typeof buildSkillsContext>[0] = {}): string {
  return renderPage("actors/pc/skills.hbs", buildSkillsContext(overrides), { wrapperClass: "pc-sheet-body" });
}

function educationsTable(page: import("@playwright/test").Page) {
  return page.locator("table").nth(1);
}

test("a representative Education renders its stored schema data", async ({ page }) => {
  await page.setContent(
    renderSkills({
      educationRows: [{ identifier: "engineering", name: "Engineering", difficulty: "advanced", training: "plus10", value: 55 }],
    }),
  );

  const row = educationsTable(page).locator("tbody tr").filter({ hasText: "Engineering" });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("Advanced");
  await expect(row).toContainText("+10");
  await expect(row.locator("button.simple-button")).toHaveText("55");
});

test("the header row has no textual label for Pinned, Name spans both columns, and the final column's header is the inert Add control", async ({
  page,
}) => {
  await page.setContent(renderSkills());

  const headers = educationsTable(page).locator("thead th");
  await expect(headers).toHaveCount(5);
  await expect(headers.nth(0)).toHaveAttribute("colspan", "2");
  await expect(headers.nth(0)).toHaveText("Name");

  const addHeader = headers.last();
  await expect(addHeader).toHaveText("");
  await expect(addHeader.locator('a[role="button"]')).toHaveAttribute("aria-label", "Add Education");
});

test("Name includes Edit, Info, and a Delete affordance carrying the Education's stable identifier", async ({ page }) => {
  await page.setContent(renderSkills({ educationRows: [{ identifier: "engineering", name: "Engineering" }] }));

  const row = educationsTable(page).locator("tbody tr").filter({ hasText: "Engineering" });
  const editControl = row.locator("a").filter({ has: page.locator("i.fa-pen-to-square") });
  await expect(editControl).toHaveAttribute("data-identifier", "engineering");
  await expect(editControl).toHaveAttribute("aria-label", "Edit Education: Engineering");

  const infoControl = row.locator("a").filter({ has: page.locator("i.fa-book-open") });
  await expect(infoControl).toHaveAttribute("data-identifier", "engineering");
  await expect(infoControl).toHaveAttribute("aria-label", "View Education Description: Engineering");

  const deleteControl = row.locator("a.dense-table-delete");
  await expect(deleteControl).toHaveCount(1);
  await expect(deleteControl).toHaveAttribute("data-identifier", "engineering");
  await expect(deleteControl).toHaveAttribute("aria-label", "Delete Education: Engineering");
  await expect(deleteControl.locator("i.fa-trash")).toHaveCount(1);

  const nameControls = row.locator(".dense-table-name-inner a");
  await expect(nameControls).toHaveCount(3);
  await expect(nameControls.nth(2)).toHaveClass(/dense-table-delete/);
});

test("the pin control represents the persisted pinned state without requiring toggle behavior", async ({ page }) => {
  await page.setContent(
    renderSkills({
      educationRows: [
        { identifier: "engineering", name: "Engineering", pinned: true },
        { identifier: "militaryHistory", name: "Military History", pinned: false },
      ],
    }),
  );

  const pinnedRow = educationsTable(page).locator("tbody tr").filter({ hasText: "Engineering" });
  const pinnedControl = pinnedRow.locator(".dense-table-pin");
  await expect(pinnedControl).toHaveAttribute("data-identifier", "engineering");
  await expect(pinnedControl).toHaveAttribute("aria-pressed", "true");
  await expect(pinnedControl).toHaveAttribute("aria-label", "Unpin Engineering");
  await expect(pinnedControl.locator("i.fa-thumbtack")).toHaveCount(1);

  const unpinnedRow = educationsTable(page).locator("tbody tr").filter({ hasText: "Military History" });
  const unpinnedControl = unpinnedRow.locator(".dense-table-pin");
  await expect(unpinnedControl).toHaveAttribute("aria-pressed", "false");
  await expect(unpinnedControl).toHaveAttribute("aria-label", "Pin Military History");
  await expect(unpinnedControl.locator("i.fa-thumbtack-slash")).toHaveCount(1);
});

test("an empty ActorEducations record still shows the summary, table structure, Add control, and an intentional empty state", async ({
  page,
}) => {
  await page.setContent(renderSkills());

  await expect(page.locator(".pc-section-heading-value")).toContainText("0");
  await expect(educationsTable(page).locator("thead th")).toHaveCount(5);
  await expect(educationsTable(page).locator('thead a[role="button"]')).toBeVisible();
  await expect(educationsTable(page).locator("tbody tr")).toHaveCount(1);
  const emptyState = educationsTable(page).locator(".dense-table-empty-state");
  await expect(emptyState).toHaveText("No Educations recorded yet.");
  await expect(emptyState).toHaveAttribute("colspan", "6");
});

test("the combined Skills/Educations page remains usable, without whole-sheet overflow, at representative sheet widths", async ({
  page,
}) => {
  await page.setContent(
    renderSkills({
      skillRows: [{ identifier: "pilotGround", name: "Pilot (Ground)" }],
      educationRows: [{ identifier: "engineering", name: "Engineering" }],
    }),
  );

  for (const width of [1000, 720, 360]) {
    await page.setViewportSize({ width, height: 2000 });
    const wraps = await page.locator(".dense-table-wrap").all();
    expect(wraps.length).toBe(2);
    for (const wrap of wraps) {
      const wrapBox = await wrap.boundingBox();
      expect(wrapBox).not.toBeNull();
      expect(wrapBox!.width).toBeLessThanOrEqual(width + 1);
    }
  }
});
