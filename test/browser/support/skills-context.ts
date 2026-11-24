// Context shape mirrors PcActorSheet._prepareContext()'s Skills/Educations
// output (both live on the same actors/pc/skills.hbs template) closely
// enough to render it faithfully for the portable Skills/Educations tests.
// characteristicOptions/targetOptions/skill- and educationTrainingOptions are consumed
// only through the narrow selectOptions stand-in (render.ts) — none of the
// migrated tests assert on option-list content, so these just need to be
// valid, non-empty arrays, not exact parity with the real computed lists.
import { type EducationRecord } from "../../../src/module/education.js";
import { type EducationRow, type SkillRow } from "../../../src/module/sheets/actors/pc-sheet.js";

// Rows the sheet builds, minus the fields no migrated test reads; every
// field a test does supply is checked against the sheet's real row type.
export type SkillRowFixture = Pick<SkillRow, "identifier" | "name"> &
  Partial<Pick<SkillRow, "pinned" | "difficulty" | "type" | "training" | "characteristic" | "characteristicOptions" | "value" | "contributions">>;

export type EducationRowFixture = Pick<EducationRow, "identifier" | "name"> &
  Partial<Pick<EducationRow, "pinned" | "difficulty" | "training" | "selected" | "targetOptions" | "value" | "contributions">>;

const DEFAULT_CHARACTERISTIC_OPTIONS: SkillRow["characteristicOptions"] = [{ value: "agi", label: "AGI" }];
const DEFAULT_TARGET_OPTIONS: EducationRow["targetOptions"] = [{ value: "int", label: "INT" }];

export function buildSkillRow(row: SkillRowFixture): Required<SkillRowFixture> {
  return {
    pinned: false,
    difficulty: "basic",
    type: [],
    training: "none",
    characteristic: "agi",
    characteristicOptions: DEFAULT_CHARACTERISTIC_OPTIONS,
    value: 0,
    contributions: [],
    ...row,
  };
}

export function buildEducationRow(row: EducationRowFixture): Required<EducationRowFixture> {
  return {
    pinned: false,
    difficulty: "basic",
    training: "plus5",
    selected: "int",
    targetOptions: DEFAULT_TARGET_OPTIONS,
    value: 0,
    contributions: [],
    ...row,
  };
}

export function buildSkillsContext(overrides: {
  skillRows?: SkillRowFixture[];
  educationRows?: EducationRowFixture[];
  education?: EducationRecord;
} = {}) {
  return {
    sheetId: "browser-tier-sheet",
    tabs: { primary: { skills: { active: true } } },
    actor: {
      system: {
        education: overrides.education ?? { value: 0, max: 0, contributions: [] },
      },
    },
    skillTrainingOptions: [
      { value: "none", label: "None" },
      { value: "trained", label: "Trained" },
      { value: "plus10", label: "+10" },
      { value: "plus20", label: "+20" },
    ],
    educationTrainingOptions: [
      { value: "plus5", label: "+5" },
      { value: "plus10", label: "+10" },
    ],
    skillRows: (overrides.skillRows ?? []).map(buildSkillRow),
    educationRows: (overrides.educationRows ?? []).map(buildEducationRow),
  };
}
