// Context shape mirrors PcActorSheet._prepareContext()'s Skills/Educations
// output (both live on the same actors/pc/skills.hbs template) closely
// enough to render it faithfully for the portable Skills/Educations tests.
// characteristicOptions/targetOptions/skillTrainingOptions are consumed
// only through the narrow selectOptions stand-in (render.ts) — none of the
// migrated tests assert on option-list content, so these just need to be
// valid, non-empty arrays, not exact parity with the real computed lists.
export type Contribution = { label: string; value: number };

export type SkillRowFixture = {
  identifier: string;
  name: string;
  pinned?: boolean;
  difficulty?: string;
  type?: string[];
  training?: string;
  characteristic?: string;
  characteristicOptions?: { value: string; label: string }[];
  value?: number;
  contributions?: Contribution[];
};

export type EducationRowFixture = {
  identifier: string;
  name: string;
  pinned?: boolean;
  difficulty?: string;
  training?: string;
  selected?: string;
  targetOptions?: { value: string; label: string }[];
  value?: number;
  contributions?: Contribution[];
};

const DEFAULT_CHARACTERISTIC_OPTIONS = [{ value: "agi", label: "AGI" }];
const DEFAULT_TARGET_OPTIONS = [{ value: "int", label: "INT" }];

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
  education?: { value: number; max: number; contributions: Contribution[] };
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
    skillRows: (overrides.skillRows ?? []).map(buildSkillRow),
    educationRows: (overrides.educationRows ?? []).map(buildEducationRow),
  };
}
