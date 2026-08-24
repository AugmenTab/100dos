// Lightweight-tier counterparts of 4 of the 5 originally-classified
// portable Skills tests. "the record key is a Skill's stable identity and
// is never duplicated inside the persisted Skill object" was NOT migrated
// — its actual point is a Document-storage invariant (the stored Skill
// object never gains an `identifier` field even though the record key
// carries that info), not a rendering concern; a lightweight version would
// trivially "pass" by construction (whatever fixture object I hand-build
// simply wouldn't have that field) without verifying anything real. Stays
// real-Foundry.
import { expect, test } from "@playwright/test";
import { buildSkillsContext } from "./support/skills-context.js";
import { renderPage } from "./support/render.js";

function renderSkills(overrides: Parameters<typeof buildSkillsContext>[0] = {}): string {
  return renderPage("actors/pc/skills.hbs", buildSkillsContext(overrides), { wrapperClass: "pc-sheet-body" });
}

function skillsTable(page: import("@playwright/test").Page) {
  return page.locator("table").first();
}

test("a representative Skill renders its stored schema data, with Type shown as a comma-separated list", async ({ page }) => {
  await page.setContent(
    renderSkills({
      skillRows: [
        {
          identifier: "pilotGround",
          name: "Pilot (Ground)",
          difficulty: "advanced",
          type: ["movement", "fieldcraft"],
          training: "plus10",
          value: 62,
        },
      ],
    }),
  );

  const row = skillsTable(page).locator("tbody tr").filter({ hasText: "Pilot (Ground)" });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("Advanced");
  await expect(row).toContainText("Movement, Fieldcraft");
  await expect(row.locator("select").nth(0)).toHaveValue("plus10");
  await expect(row.locator("button.simple-button")).toHaveText("62");
});

test("the header row has no textual label for Pinned, Name spans both columns, and the final column's header is the inert Add control", async ({
  page,
}) => {
  await page.setContent(renderSkills());

  const headers = skillsTable(page).locator("thead th");
  await expect(headers).toHaveCount(6);
  await expect(headers.nth(0)).toHaveAttribute("colspan", "2");
  await expect(headers.nth(0)).toHaveText("Name");

  const addHeader = headers.last();
  await expect(addHeader).toHaveText("");
  await expect(addHeader.locator('a[role="button"]')).toHaveAttribute("aria-label", "Add Skill");
});

test("an empty ActorSkills record still shows the table structure, the Add control, and an intentional empty state", async ({
  page,
}) => {
  await page.setContent(renderSkills());

  await expect(skillsTable(page).locator("thead th")).toHaveCount(6);
  await expect(skillsTable(page).locator('thead a[role="button"]')).toBeVisible();
  await expect(skillsTable(page).locator("tbody tr")).toHaveCount(1);
  const emptyState = skillsTable(page).locator(".dense-table-empty-state");
  await expect(emptyState).toHaveText("No Skills recorded yet.");
  await expect(emptyState).toHaveAttribute("colspan", "7");
});

test("the Skills table remains usable, without whole-sheet overflow, at representative sheet widths", async ({ page }) => {
  await page.setContent(
    renderSkills({
      skillRows: [
        { identifier: "pilotGround", name: "Pilot (Ground)" },
        { identifier: "persuasion", name: "Persuasion" },
      ],
    }),
  );

  for (const width of [1000, 720, 360]) {
    await page.setViewportSize({ width, height: 2000 });
    const wrapBox = await page.locator(".dense-table-wrap").first().boundingBox();
    expect(wrapBox).not.toBeNull();
    expect(wrapBox!.width).toBeLessThanOrEqual(width + 1);
  }
});
