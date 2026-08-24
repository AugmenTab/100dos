import { expect, test } from "./support/diagnostics.js";
import { resetFixtures } from "./support/fixtures.js";
import { openPcSheet, resizePcSheet } from "./support/pc-sheet.js";
import { type Locator, type Page } from "@playwright/test";

// Representative populated Education — a Skill-identifier option list
// including an identifier the fixture Actor doesn't actually have (see the
// missing-target test below), plus a real Skill so the resolved-label path
// is also exercised.
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

async function getEducation(page: Page, actorId: string, identifier: string): Promise<Record<string, unknown> | undefined> {
  return page.evaluate(
    ({ actorId, identifier }) =>
      (game.actors.get(actorId) as unknown as { system: { educations: Record<string, Record<string, unknown>> } })
        ?.system.educations[identifier],
    { actorId, identifier },
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

test.describe("Educations section", () => {
  test("a new PC has a zeroed EducationRecord and an empty ActorEducations record", async ({ foundryPage: page, fixtureLane }) => {
    const { actorId } = await resetFixtures(page, fixtureLane);
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
    foundryPage: page,
    fixtureLane,
  }) => {
    const { actorId } = await resetFixtures(page, fixtureLane);
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

  test("the Characteristic/Skill selector offers only that Education's own options, resolving a Characteristic ID to its abbreviation and a Skill identifier to the Actor's Skill name, with the stored value selected", async ({
    foundryPage: page,
    fixtureLane,
  }) => {
    const { actorId } = await resetFixtures(page, fixtureLane);
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

  test("a Skill-identifier option with no matching Actor Skill falls back to the raw identifier rather than being hidden or mutated", async ({
    foundryPage: page,
    fixtureLane,
  }) => {
    const { actorId } = await resetFixtures(page, fixtureLane);
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

  test("the value control shows the stored value via a simple button with the existing Contributions tooltip", async ({
    foundryPage: page,
    fixtureLane,
  }) => {
    const { actorId } = await resetFixtures(page, fixtureLane);
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
    foundryPage: page,
    fixtureLane,
  }) => {
    const { actorId } = await resetFixtures(page, fixtureLane);
    await updateActor(page, actorId, { "system.educations.engineering": ENGINEERING });

    const education = await getEducation(page, actorId, "engineering");
    expect(education?.identifier).toBeUndefined();

    const sheetId = await openPcSheet(page, actorId);
    const panel = await openSkillsTab(page, sheetId);
    await expect(educationsTable(panel).locator('[data-identifier="engineering"]').first()).toBeVisible();
  });

});
