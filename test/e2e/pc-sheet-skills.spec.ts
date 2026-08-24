import { expect, test } from "./support/diagnostics.js";
import { resetFixtures } from "./support/fixtures.js";
import { ensureGameView } from "./support/foundry-session.js";
import { openPcSheet, resizePcSheet } from "./support/pc-sheet.js";
import { type Locator, type Page } from "@playwright/test";

// Representative populated Skill — advanced/fieldcraft, Trained +10, a
// two-Characteristic allow-list with the second entry selected (so tests
// can't pass merely by coincidentally picking the first option).
const PILOT_GROUND = {
  name: "Pilot (Ground)",
  difficulty: "advanced",
  type: ["fieldcraft"],
  training: "plus10",
  characteristic: "int",
  characteristics: ["agi", "int"],
  value: 62,
  pinned: true,
  description: "<p>Operating wheeled and tracked ground vehicles.</p>",
  contributions: [
    { label: "Agility", value: 45 },
    { label: "Trained", value: 10 },
    { label: "Pilot Specialty", value: 5 },
  ],
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

async function getSkill(page: Page, actorId: string, identifier: string): Promise<Record<string, unknown> | undefined> {
  return page.evaluate(
    ({ actorId, identifier }) =>
      (game.actors.get(actorId) as unknown as { system: { skills: Record<string, Record<string, unknown>> } })
        ?.system.skills[identifier],
    { actorId, identifier },
  );
}

async function openSkillsTab(page: Page, sheetId: string): Promise<Locator> {
  const sheet = page.locator(`#${sheetId}`);
  await sheet.locator('[role="tab"][data-group="primary"][data-tab="skills"]').click();
  return sheet.locator('.tab[data-group="primary"][data-tab="skills"]');
}

// The Skills page panel also contains the Educations table — scope to the
// Skills table specifically (the first <table> in the panel) so its
// header/row/empty-state counts aren't conflated with the Educations
// section below it.
function skillsTable(panel: Locator): Locator {
  return panel.locator("table").first();
}

test.beforeEach(async ({ page, baseURL }) => {
  await page.goto(baseURL ?? "/");
  await ensureGameView(page);
});

test.describe("Skills page", () => {
  test("a new PC has an empty ActorSkills record", async ({ page }) => {
    const { actorId } = await resetFixtures(page);
    const skills = await page.evaluate((actorId) => game.actors.get(actorId)?.system.skills, actorId);
    expect(skills).toEqual({});
  });

  test("a representative Skill renders its stored schema data, with Type shown as a comma-separated list", async ({
    page,
  }) => {
    const { actorId } = await resetFixtures(page);
    await updateActor(page, actorId, {
      "system.skills.pilotGround": { ...PILOT_GROUND, type: ["movement", "fieldcraft"] },
    });
    const sheetId = await openPcSheet(page, actorId);
    const panel = await openSkillsTab(page, sheetId);

    const row = skillsTable(panel).locator("tbody tr").filter({ hasText: "Pilot (Ground)" });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText("Advanced");
    await expect(row).toContainText("Movement, Fieldcraft");
    await expect(row.locator("select").nth(0)).toHaveValue("plus10");
    await expect(row.locator("button.simple-button")).toHaveText("62");
  });

  test("the header row has no textual label for Pinned, Name spans both columns, and the final column's header is the inert Add control", async ({
    page,
  }) => {
    const { actorId } = await resetFixtures(page);
    const sheetId = await openPcSheet(page, actorId);
    const panel = await openSkillsTab(page, sheetId);

    const headers = skillsTable(panel).locator("thead th");
    await expect(headers).toHaveCount(6);
    await expect(headers.nth(0)).toHaveAttribute("colspan", "2");
    await expect(headers.nth(0)).toHaveText("Name");

    const addHeader = headers.last();
    await expect(addHeader).toHaveText("");
    await expect(addHeader.locator('a[role="button"]')).toHaveAttribute("aria-label", "Add Skill");
  });

  test("the Characteristic selector offers only that Skill's own allowed Characteristics, in order, with the stored value selected", async ({
    page,
  }) => {
    const { actorId } = await resetFixtures(page);
    await updateActor(page, actorId, { "system.skills.pilotGround": PILOT_GROUND });
    const sheetId = await openPcSheet(page, actorId);
    const panel = await openSkillsTab(page, sheetId);
    const row = skillsTable(panel).locator("tbody tr").filter({ hasText: "Pilot (Ground)" });

    const characteristicSelect = row.locator('select[name="system.skills.pilotGround.characteristic"]');
    const optionLabels = await characteristicSelect.locator("option").allTextContents();
    expect(optionLabels).toEqual(["AGI", "INT"]);
    await expect(characteristicSelect).toHaveValue("int");

    await characteristicSelect.selectOption("agi");
    await expect
      .poll(async () => (await getSkill(page, actorId, "pilotGround"))?.characteristic)
      .toBe("agi");

    const skill = await getSkill(page, actorId, "pilotGround");
    expect(skill?.value).toBe(62);
    expect(skill?.contributions).toEqual(PILOT_GROUND.contributions);
  });

  test("the Training selector offers the four fixed options with the stored value selected, and updates only training through normal binding", async ({
    page,
  }) => {
    const { actorId } = await resetFixtures(page);
    await updateActor(page, actorId, { "system.skills.pilotGround": PILOT_GROUND });
    const sheetId = await openPcSheet(page, actorId);
    const panel = await openSkillsTab(page, sheetId);
    const row = skillsTable(panel).locator("tbody tr").filter({ hasText: "Pilot (Ground)" });

    const trainingSelect = row.locator('select[name="system.skills.pilotGround.training"]');
    const optionLabels = await trainingSelect.locator("option").allTextContents();
    expect(optionLabels).toEqual(["None", "Trained", "+10", "+20"]);
    await expect(trainingSelect).toHaveValue("plus10");

    await trainingSelect.selectOption("plus20");
    await expect
      .poll(async () => (await getSkill(page, actorId, "pilotGround"))?.training)
      .toBe("plus20");

    const skill = await getSkill(page, actorId, "pilotGround");
    expect(skill?.value).toBe(62);
    expect(skill?.characteristic).toBe("int");
  });

  test("the pin control reflects and toggles the persisted pinned state", async ({ page }) => {
    const { actorId } = await resetFixtures(page);
    await updateActor(page, actorId, {
      "system.skills.pilotGround": PILOT_GROUND,
      "system.skills.persuasion": { ...PILOT_GROUND, name: "Persuasion", pinned: false },
    });
    const sheetId = await openPcSheet(page, actorId);
    const panel = await openSkillsTab(page, sheetId);

    const pinnedControl = skillsTable(panel).locator('.dense-table-pin[data-identifier="pilotGround"]');
    await expect(pinnedControl).toHaveAttribute("aria-pressed", "true");
    await expect(pinnedControl).toHaveAttribute("aria-label", "Unpin Pilot (Ground)");
    await expect(pinnedControl.locator("i.fa-thumbtack")).toHaveCount(1);

    const unpinnedControl = skillsTable(panel).locator('.dense-table-pin[data-identifier="persuasion"]');
    await expect(unpinnedControl).toHaveAttribute("aria-pressed", "false");
    await expect(unpinnedControl).toHaveAttribute("aria-label", "Pin Persuasion");
    await expect(unpinnedControl.locator("i.fa-thumbtack-slash")).toHaveCount(1);

    await unpinnedControl.click();
    await expect
      .poll(async () => (await getSkill(page, actorId, "persuasion"))?.pinned)
      .toBe(true);
  });

  test("Edit and description controls carry the Skill's stable identifier and an accessible name; the value control shows the stored value via a simple button with the existing Contributions tooltip", async ({
    page,
  }) => {
    const { actorId } = await resetFixtures(page);
    await updateActor(page, actorId, { "system.skills.pilotGround": PILOT_GROUND });
    const sheetId = await openPcSheet(page, actorId);
    const panel = await openSkillsTab(page, sheetId);
    const row = skillsTable(panel).locator("tbody tr").filter({ hasText: "Pilot (Ground)" });

    const editControl = row.locator("a").filter({ has: page.locator("i.fa-pen-to-square") });
    await expect(editControl).toHaveAttribute("data-identifier", "pilotGround");
    await expect(editControl).toHaveAttribute("aria-label", "Edit Skill: Pilot (Ground)");

    const descriptionControl = row.locator("a").filter({ has: page.locator("i.fa-book-open") });
    await expect(descriptionControl).toHaveAttribute("data-identifier", "pilotGround");
    await expect(descriptionControl).toHaveAttribute("aria-label", "View Skill Description: Pilot (Ground)");

    const rollButton = row.locator("button.simple-button");
    await expect(rollButton).toHaveText("62");
    await expect(rollButton).toHaveAttribute("aria-label", "Roll Pilot (Ground)");

    const tooltip = page.locator("#tooltip");
    await expect(tooltip).not.toHaveClass(/active/);
    await rollButton.hover();
    await expect(tooltip).toHaveClass(/active/, { timeout: 3000 });
    const labels = await tooltip.locator(".dos100-tooltip-row-label").allTextContents();
    const values = await tooltip.locator(".dos100-tooltip-row-value").allTextContents();
    expect(labels).toEqual(["Agility", "Trained", "Pilot Specialty"]);
    expect(values.map(Number)).toEqual([45, 10, 5]);
  });

  test("the record key is a Skill's stable identity and is never duplicated inside the persisted Skill object", async ({
    page,
  }) => {
    const { actorId } = await resetFixtures(page);
    await updateActor(page, actorId, { "system.skills.pilotGround": PILOT_GROUND });

    const skill = await getSkill(page, actorId, "pilotGround");
    expect(skill?.identifier).toBeUndefined();

    const sheetId = await openPcSheet(page, actorId);
    const panel = await openSkillsTab(page, sheetId);
    await expect(skillsTable(panel).locator('.dense-table-pin[data-identifier="pilotGround"]')).toHaveCount(1);
  });

  test("an empty ActorSkills record still shows the table structure, the Add control, and an intentional empty state", async ({
    page,
  }) => {
    const { actorId } = await resetFixtures(page);
    const sheetId = await openPcSheet(page, actorId);
    const panel = await openSkillsTab(page, sheetId);

    await expect(skillsTable(panel).locator("thead th")).toHaveCount(6);
    await expect(skillsTable(panel).locator('thead a[role="button"]')).toBeVisible();
    await expect(skillsTable(panel).locator("tbody tr")).toHaveCount(1);
    const emptyState = skillsTable(panel).locator(".ledger-table-empty-state");
    await expect(emptyState).toHaveText("No Skills recorded yet.");
    await expect(emptyState).toHaveAttribute("colspan", "7");
  });

  test("the Skills table remains usable, without whole-sheet overflow, at representative sheet widths", async ({
    page,
  }) => {
    const { actorId } = await resetFixtures(page);
    await updateActor(page, actorId, {
      "system.skills.pilotGround": PILOT_GROUND,
      "system.skills.persuasion": { ...PILOT_GROUND, name: "Persuasion", pinned: false },
    });
    const sheetId = await openPcSheet(page, actorId);
    const sheet = page.locator(`#${sheetId}`);

    for (const width of [1000, 720, 360]) {
      await resizePcSheet(page, sheetId, width);
      const panel = await openSkillsTab(page, sheetId);
      const sheetBox = await sheet.boundingBox();
      const wrapBox = await panel.locator(".ledger-table-wrap").first().boundingBox();
      expect(sheetBox).not.toBeNull();
      expect(wrapBox).not.toBeNull();
      expect(wrapBox!.width).toBeLessThanOrEqual(sheetBox!.width + 1);
    }
  });
});
