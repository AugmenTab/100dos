import { expect, test } from "./support/diagnostics.js";
import { resetFixtures } from "./support/fixtures.js";
import { ensureGameView } from "./support/foundry-session.js";
import { openPcSheet, resizePcSheet } from "./support/pc-sheet.js";
import { type Locator, type Page } from "@playwright/test";

// Representative populated Education matching .local/plan.md's own worked
// example — a Skill-tag option list including a tag the fixture Actor
// doesn't actually have (see the missing-target test below), plus a real
// Skill so the resolved-label path is also exercised.
const ENGINEERING = {
  name: "Engineering",
  difficulty: "advanced",
  training: "plus10",
  selected: "int",
  options: ["int", "per", "pilotGround"],
  value: 55,
  pinned: true,
  description: "<p>Designing and building mechanical and structural systems.</p>",
  contributions: [
    { label: "Intellect", value: 25 },
    { label: "Trained +10", value: 30 },
  ],
};

const PILOT_GROUND_SKILL = {
  name: "Pilot (Ground)",
  difficulty: "advanced",
  type: ["fieldcraft"],
  training: "plus10",
  characteristic: "agi",
  characteristics: ["agi", "int"],
  value: 62,
  pinned: false,
  description: "<p></p>",
  contributions: [],
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

async function getEducation(page: Page, actorId: string, tag: string): Promise<Record<string, unknown> | undefined> {
  return page.evaluate(
    ({ actorId, tag }) =>
      (game.actors.get(actorId) as unknown as { system: { educations: Record<string, Record<string, unknown>> } })
        ?.system.educations[tag],
    { actorId, tag },
  );
}

async function openSkillsTab(page: Page, sheetId: string): Promise<Locator> {
  const sheet = page.locator(`#${sheetId}`);
  await sheet.locator('[role="tab"][data-group="primary"][data-tab="skills"]').click();
  return sheet.locator('.tab[data-group="primary"][data-tab="skills"]');
}

// The Skills table (see pc-sheet-skills.spec.ts) precedes the Educations
// section in the same panel — scope to the Educations <table> specifically
// (the second <table> in the panel) so counts aren't conflated with Skills.
function educationsTable(panel: Locator): Locator {
  return panel.locator("table").nth(1);
}

test.beforeEach(async ({ page, baseURL }) => {
  await page.goto(baseURL ?? "/");
  await ensureGameView(page);
});

test.describe("Educations section", () => {
  test("a new PC has a zeroed EducationRecord and an empty ActorEducations record", async ({ page }) => {
    const { actorId } = await resetFixtures(page);
    const system = await page.evaluate(
      (actorId) => {
        const actor = game.actors.get(actorId);
        return { education: actor?.system.education, educations: actor?.system.educations };
      },
      actorId,
    );
    expect(system.education).toEqual({ value: 0, max: 0, contributions: [] });
    expect(system.educations).toEqual({});
  });

  test("the Educations heading displays stored system.education value/max, with a Contributions tooltip on max", async ({
    page,
  }) => {
    const { actorId } = await resetFixtures(page);
    await updateActor(page, actorId, {
      "system.education": {
        value: 55,
        max: 80,
        contributions: [{ label: "Intellect", value: 25 }, { label: "Education (Background)", value: 55 }],
      },
    });
    const sheetId = await openPcSheet(page, actorId);
    const panel = await openSkillsTab(page, sheetId);

    const heading = panel.locator(".pc-section-heading-value");
    await expect(heading).toContainText("55");
    await expect(heading).toContainText("80");

    const maxValue = heading.locator('[aria-label="Max Educations"]');
    await expect(maxValue).toHaveText("80");

    const tooltip = page.locator("#tooltip");
    await expect(tooltip).not.toHaveClass(/active/);
    await maxValue.hover();
    await expect(tooltip).toHaveClass(/active/, { timeout: 3000 });
    const labels = await tooltip.locator(".dos100-tooltip-row-label").allTextContents();
    const values = await tooltip.locator(".dos100-tooltip-row-value").allTextContents();
    expect(labels).toEqual(["Intellect", "Education (Background)"]);
    expect(values.map(Number)).toEqual([25, 55]);
  });

  test("a representative Education renders its stored schema data", async ({ page }) => {
    const { actorId } = await resetFixtures(page);
    await updateActor(page, actorId, { "system.educations.engineering": ENGINEERING });
    const sheetId = await openPcSheet(page, actorId);
    const panel = await openSkillsTab(page, sheetId);

    const row = educationsTable(panel).locator("tbody tr").filter({ hasText: "Engineering" });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText("Advanced");
    await expect(row).toContainText("+10");
    await expect(row.locator("button.simple-button")).toHaveText("55");
  });

  test("the header row has no textual label for Pinned, Name spans both columns, and the final column's header is the inert Add control", async ({
    page,
  }) => {
    const { actorId } = await resetFixtures(page);
    const sheetId = await openPcSheet(page, actorId);
    const panel = await openSkillsTab(page, sheetId);

    const headers = educationsTable(panel).locator("thead th");
    await expect(headers).toHaveCount(5);
    await expect(headers.nth(0)).toHaveAttribute("colspan", "2");
    await expect(headers.nth(0)).toHaveText("Name");

    const addHeader = headers.last();
    await expect(addHeader).toHaveText("");
    await expect(addHeader.locator('a[role="button"]')).toHaveAttribute("aria-label", "Add Education");
  });

  test("the Characteristic/Skill selector offers only that Education's own options, resolving a Characteristic ID to its abbreviation and a Skill tag to the Actor's Skill name, with the stored value selected", async ({
    page,
  }) => {
    const { actorId } = await resetFixtures(page);
    await updateActor(page, actorId, {
      "system.skills.pilotGround": PILOT_GROUND_SKILL,
      "system.educations.engineering": ENGINEERING,
    });
    const sheetId = await openPcSheet(page, actorId);
    const panel = await openSkillsTab(page, sheetId);
    const row = educationsTable(panel).locator("tbody tr").filter({ hasText: "Engineering" });

    const targetSelect = row.locator('select[name="system.educations.engineering.selected"]');
    const optionLabels = await targetSelect.locator("option").allTextContents();
    expect(optionLabels).toEqual(["INT", "PER", "Pilot (Ground)"]);
    await expect(targetSelect).toHaveValue("int");

    await targetSelect.selectOption("pilotGround");
    await expect
      .poll(async () => (await getEducation(page, actorId, "engineering"))?.selected)
      .toBe("pilotGround");

    const education = await getEducation(page, actorId, "engineering");
    expect(education?.value).toBe(55);
    expect(education?.contributions).toEqual(ENGINEERING.contributions);
  });

  test("a Skill-tag option with no matching Actor Skill falls back to the raw tag rather than being hidden or mutated", async ({
    page,
  }) => {
    const { actorId } = await resetFixtures(page);
    await updateActor(page, actorId, {
      "system.educations.militaryHistory": {
        ...ENGINEERING,
        name: "Military History",
        selected: "survival",
        options: ["int", "survival"],
      },
    });
    const sheetId = await openPcSheet(page, actorId);
    const panel = await openSkillsTab(page, sheetId);
    const row = educationsTable(panel).locator("tbody tr").filter({ hasText: "Military History" });

    const targetSelect = row.locator('select[name="system.educations.militaryHistory.selected"]');
    const optionLabels = await targetSelect.locator("option").allTextContents();
    expect(optionLabels).toEqual(["INT", "survival"]);
    await expect(targetSelect).toHaveValue("survival");

    const education = await getEducation(page, actorId, "militaryHistory");
    expect(education?.options).toEqual(["int", "survival"]);
  });

  test("Name includes Edit, Info, and a Delete affordance carrying the Education's stable tag", async ({
    page,
  }) => {
    const { actorId } = await resetFixtures(page);
    await updateActor(page, actorId, { "system.educations.engineering": ENGINEERING });
    const sheetId = await openPcSheet(page, actorId);
    const panel = await openSkillsTab(page, sheetId);
    const row = educationsTable(panel).locator("tbody tr").filter({ hasText: "Engineering" });

    const editControl = row.locator("a").filter({ has: page.locator("i.fa-pen-to-square") });
    await expect(editControl).toHaveAttribute("data-tag", "engineering");
    await expect(editControl).toHaveAttribute("aria-label", "Edit Education: Engineering");

    const infoControl = row.locator("a").filter({ has: page.locator("i.fa-book-open") });
    await expect(infoControl).toHaveAttribute("data-tag", "engineering");
    await expect(infoControl).toHaveAttribute("aria-label", "View Education Description: Engineering");

    const deleteControl = row.locator("a.dense-table-delete");
    await expect(deleteControl).toHaveCount(1);
    await expect(deleteControl).toHaveAttribute("data-tag", "engineering");
    await expect(deleteControl).toHaveAttribute("aria-label", "Delete Education: Engineering");
    await expect(deleteControl.locator("i.fa-trash")).toHaveCount(1);

    // Delete must come after Edit and Info, per .local/plan.md.
    const nameControls = row.locator(".dense-table-name-inner a");
    await expect(nameControls).toHaveCount(3);
    await expect(nameControls.nth(2)).toHaveClass(/dense-table-delete/);
  });

  test("the pin control represents the persisted pinned state without requiring toggle behavior", async ({
    page,
  }) => {
    const { actorId } = await resetFixtures(page);
    await updateActor(page, actorId, {
      "system.educations.engineering": ENGINEERING,
      "system.educations.militaryHistory": { ...ENGINEERING, name: "Military History", pinned: false },
    });
    const sheetId = await openPcSheet(page, actorId);
    const panel = await openSkillsTab(page, sheetId);

    const pinnedRow = educationsTable(panel).locator("tbody tr").filter({ hasText: "Engineering" });
    const pinnedControl = pinnedRow.locator(".dense-table-pin");
    await expect(pinnedControl).toHaveAttribute("data-tag", "engineering");
    await expect(pinnedControl).toHaveAttribute("aria-pressed", "true");
    await expect(pinnedControl).toHaveAttribute("aria-label", "Unpin Engineering");
    await expect(pinnedControl.locator("i.fa-thumbtack")).toHaveCount(1);

    const unpinnedRow = educationsTable(panel).locator("tbody tr").filter({ hasText: "Military History" });
    const unpinnedControl = unpinnedRow.locator(".dense-table-pin");
    await expect(unpinnedControl).toHaveAttribute("aria-pressed", "false");
    await expect(unpinnedControl).toHaveAttribute("aria-label", "Pin Military History");
    await expect(unpinnedControl.locator("i.fa-thumbtack-slash")).toHaveCount(1);
  });

  test("the value control shows the stored value via a simple button with the existing Contributions tooltip", async ({
    page,
  }) => {
    const { actorId } = await resetFixtures(page);
    await updateActor(page, actorId, { "system.educations.engineering": ENGINEERING });
    const sheetId = await openPcSheet(page, actorId);
    const panel = await openSkillsTab(page, sheetId);
    const row = educationsTable(panel).locator("tbody tr").filter({ hasText: "Engineering" });

    const rollButton = row.locator("button.simple-button");
    await expect(rollButton).toHaveText("55");
    await expect(rollButton).toHaveAttribute("aria-label", "Roll Engineering");

    const tooltip = page.locator("#tooltip");
    await expect(tooltip).not.toHaveClass(/active/);
    await rollButton.hover();
    await expect(tooltip).toHaveClass(/active/, { timeout: 3000 });
    const labels = await tooltip.locator(".dos100-tooltip-row-label").allTextContents();
    const values = await tooltip.locator(".dos100-tooltip-row-value").allTextContents();
    expect(labels).toEqual(["Intellect", "Trained +10"]);
    expect(values.map(Number)).toEqual([25, 30]);
  });

  test("the record key is an Education's stable identity and is never duplicated inside the persisted Education object", async ({
    page,
  }) => {
    const { actorId } = await resetFixtures(page);
    await updateActor(page, actorId, { "system.educations.engineering": ENGINEERING });

    const education = await getEducation(page, actorId, "engineering");
    expect(education?.tag).toBeUndefined();

    const sheetId = await openPcSheet(page, actorId);
    const panel = await openSkillsTab(page, sheetId);
    await expect(educationsTable(panel).locator('[data-tag="engineering"]').first()).toBeVisible();
  });

  test("an empty ActorEducations record still shows the summary, table structure, Add control, and an intentional empty state", async ({
    page,
  }) => {
    const { actorId } = await resetFixtures(page);
    const sheetId = await openPcSheet(page, actorId);
    const panel = await openSkillsTab(page, sheetId);

    await expect(panel.locator(".pc-section-heading-value")).toContainText("0");
    await expect(educationsTable(panel).locator("thead th")).toHaveCount(5);
    await expect(educationsTable(panel).locator('thead a[role="button"]')).toBeVisible();
    await expect(educationsTable(panel).locator("tbody tr")).toHaveCount(1);
    const emptyState = educationsTable(panel).locator(".ledger-table-empty-state");
    await expect(emptyState).toHaveText("No Educations recorded yet.");
    await expect(emptyState).toHaveAttribute("colspan", "6");
  });

  test("the combined Skills/Educations page remains usable, without whole-sheet overflow, at representative sheet widths", async ({
    page,
  }) => {
    const { actorId } = await resetFixtures(page);
    await updateActor(page, actorId, {
      "system.skills.pilotGround": PILOT_GROUND_SKILL,
      "system.educations.engineering": ENGINEERING,
    });
    const sheetId = await openPcSheet(page, actorId);
    const sheet = page.locator(`#${sheetId}`);

    for (const width of [1000, 720, 360]) {
      await resizePcSheet(page, sheetId, width);
      const panel = await openSkillsTab(page, sheetId);
      const sheetBox = await sheet.boundingBox();
      const wrapBoxes = await panel.locator(".ledger-table-wrap").all();
      expect(sheetBox).not.toBeNull();
      expect(wrapBoxes.length).toBe(2);
      for (const wrap of wrapBoxes) {
        const wrapBox = await wrap.boundingBox();
        expect(wrapBox).not.toBeNull();
        expect(wrapBox!.width).toBeLessThanOrEqual(sheetBox!.width + 1);
      }
    }
  });
});
