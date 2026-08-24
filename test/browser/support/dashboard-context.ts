// Context shape mirrors PcActorSheet._prepareContext()'s Dashboard-relevant
// output (src/module/sheets/actors/pc-sheet.ts) closely enough to render
// actors/pc/dashboard.hbs faithfully for the portable Dashboard tests. Only
// fields those tests actually exercise are populated with realistic
// non-default values; everything else gets safe empty/false defaults so
// the template renders without needing selectOptions (never triggered by
// these tests — archetype/movement-mode selects only appear in branches
// none of the migrated tests take) or other unimplemented Foundry-core
// helpers.
export type Contribution = { label: string; value: number };
export type ValueWithContributions = { value: number; contributions?: Contribution[] };

const CHARACTERISTIC_IDS = ["str", "tou", "agi", "wfr", "wfm", "int", "per", "crg", "cha", "ldr"] as const;

function zeroMovementStat(): ValueWithContributions {
  return { value: 0, contributions: [] };
}

/** Default "land" mode base: every field the template's land branch reads, zeroed. */
function defaultMovementBase(): Record<string, unknown> {
  return {
    half: zeroMovementStat(),
    full: zeroMovementStat(),
    charge: zeroMovementStat(),
    run: zeroMovementStat(),
    jump: zeroMovementStat(),
    leap: zeroMovementStat(),
    climb: zeroMovementStat(),
    swim: { full: zeroMovementStat() },
    sprint: null,
  };
}

function defaultCharacteristics(): Record<string, { value: number; temp: number; advancement: number; contributions: Contribution[] }> {
  const out: Record<string, { value: number; temp: number; advancement: number; contributions: Contribution[] }> = {};
  for (const id of CHARACTERISTIC_IDS) out[id] = { value: 0, temp: 0, advancement: 0, contributions: [] };
  return out;
}

export type DrLocationFixture = {
  key: string;
  type: string;
  label: string;
  value: number;
  destroyed?: boolean;
  contributions?: Contribution[];
};

/** Groups locations by type, mirroring the real context's drCategories shape. */
export function buildDrCategories(locations: DrLocationFixture[]): { type: string; locations: DrLocationFixture[] }[] {
  const byType = new Map<string, DrLocationFixture[]>();
  for (const rawLoc of locations) {
    const loc = { contributions: [], destroyed: false, ...rawLoc };
    const list = byType.get(loc.type) ?? [];
    list.push(loc);
    byType.set(loc.type, list);
  }
  return Array.from(byType.entries()).map(([type, locs]) => ({ type, locations: locs }));
}

export type DashboardContextOverrides = {
  actor?: {
    img?: string;
    name?: string;
    system?: Partial<{
      xp: { tier: number; earned: number };
      basic: { height: string; weight: number; age: number; gender: string };
      archetype: string | null;
      characteristics: Record<string, { value: number; temp: number; advancement: number; contributions: Contribution[] }>;
      mythicCharacteristics: Record<string, ValueWithContributions>;
      initiative: ValueWithContributions;
      wounds: { value: number; max: number; temp: number; contributions: Contribution[] };
      fatigue: { value: number; max: number; penalty: number; contributions: Contribution[] };
      luck: { value: number; max: number; contributions: Contribution[] };
      movement: { mode: string; base: Record<string, unknown> };
    }>;
  };
  drCategories?: { type: string; locations: DrLocationFixture[] }[];
  quickUseItems?: { id: string; name: string; img: string }[];
  pinnedSkills?: { name: string }[];
  pinnedEducations?: { name: string }[];
  activeStatuses?: unknown[];
  activeEffects?: unknown[];
};

export function buildDashboardContext(overrides: DashboardContextOverrides = {}) {
  const quickUseItems = overrides.quickUseItems ?? [];
  const pinnedSkills = overrides.pinnedSkills ?? [];
  const pinnedEducations = overrides.pinnedEducations ?? [];
  const activeStatuses = overrides.activeStatuses ?? [];
  const activeEffects = overrides.activeEffects ?? [];
  return {
    sheetId: "browser-tier-sheet",
    tabs: { primary: { dashboard: { active: true } } },
    actor: {
      img: overrides.actor?.img ?? "icons/svg/mystery-man.svg",
      name: overrides.actor?.name ?? "[Browser] PC",
      system: {
        xp: overrides.actor?.system?.xp ?? { tier: 0, earned: 0 },
        basic: overrides.actor?.system?.basic ?? { height: "", weight: 0, age: 0, gender: "" },
        archetype: overrides.actor?.system?.archetype ?? null,
        characteristics: overrides.actor?.system?.characteristics ?? defaultCharacteristics(),
        mythicCharacteristics: overrides.actor?.system?.mythicCharacteristics ?? {},
        initiative: overrides.actor?.system?.initiative ?? { value: 0, contributions: [] },
        wounds: overrides.actor?.system?.wounds ?? { value: 0, max: 0, temp: 0, contributions: [] },
        fatigue: overrides.actor?.system?.fatigue ?? { value: 0, max: 0, penalty: 0, contributions: [] },
        luck: overrides.actor?.system?.luck ?? { value: 0, max: 0, contributions: [] },
        movement: overrides.actor?.system?.movement ?? { mode: "land", base: defaultMovementBase() },
      },
    },
    selectedArchetype: null,
    archetypeOptions: [],
    hasMythicCharacteristics: Object.keys(overrides.actor?.system?.mythicCharacteristics ?? {}).length > 0,
    drCategories: overrides.drCategories ?? [],
    hasAlternateMovementModes: false,
    movementModeOptions: [],
    quickUseItems,
    pinnedSkills,
    pinnedEducations,
    hasNoPinnedSkillsOrEducations: pinnedSkills.length === 0 && pinnedEducations.length === 0,
    activeStatuses,
    activeEffects,
  };
}
