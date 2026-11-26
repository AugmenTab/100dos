// Context shape mirrors PcActorSheet._prepareContext()'s Dashboard-relevant
// output (src/module/sheets/actors/pc-sheet.ts) closely enough to render
// actors/pc/dashboard.hbs faithfully for the portable Dashboard tests. Only
// fields those tests actually exercise are populated with realistic
// non-default values; everything else gets safe empty/false defaults.
// The Race/Soldier Type selectors render through the harness's narrow
// selectOptions stand-in (see render.ts).
import { type PcSystem } from "../../../src/module/actors/pc.js";
import { type CompositionSelector } from "../../../src/module/sheets/actors/pc-sheet.js";
import { type CharacteristicId, type Characteristic } from "../../../src/module/characteristic.js";
import { type Contribution } from "../../../src/module/contribution.js";
import { type DamageResistanceLocation } from "../../../src/module/damage-resistance.js";
import { type BodyLocationType } from "../../../src/module/body-location.js";
import { type DeepPartial } from "./deep-partial.js";

type ValueWithContributions = { value: number; contributions?: Contribution[] };

const CHARACTERISTIC_IDS: readonly CharacteristicId[] = ["str", "tou", "agi", "wfr", "wfm", "int", "per", "crg", "cha", "ldr"];

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

function defaultCharacteristics(): Partial<Record<CharacteristicId, DeepPartial<Characteristic>>> {
  const out: Partial<Record<CharacteristicId, DeepPartial<Characteristic>>> = {};
  for (const id of CHARACTERISTIC_IDS) out[id] = { value: 0, temp: 0, advancement: 0, contributions: [] };
  return out;
}

export type DrLocationFixture = { key: string } & Pick<DamageResistanceLocation, "type" | "label" | "value"> &
  Partial<Pick<DamageResistanceLocation, "destroyed" | "contributions">>;

type DrCategoryFixture = { type: BodyLocationType; locations: DrLocationFixture[] };

/** Groups locations by type, mirroring the real context's drCategories shape. */
export function buildDrCategories(locations: DrLocationFixture[]): DrCategoryFixture[] {
  const byType = new Map<BodyLocationType, DrLocationFixture[]>();
  for (const rawLoc of locations) {
    const loc = { contributions: [], destroyed: false, ...rawLoc };
    const list = byType.get(loc.type) ?? [];
    list.push(loc);
    byType.set(loc.type, list);
  }
  return Array.from(byType.entries()).map(([type, locs]) => ({ type, locations: locs }));
}

// One owned Race/Soldier Type as a selector option; `active` marks the
// selection, mirroring how the real sheet derives it from system.active.
export type CompositionItemFixture = { id: string; name: string; img?: string; active?: boolean };

/** Builds one selector exactly as PcActorSheet#compositionSelector shapes it. */
export function buildCompositionSelector(
  type: CompositionSelector["type"],
  owned: CompositionItemFixture[] = [],
): CompositionSelector {
  const labels = {
    race: { label: "Race", noneLabel: "None", addLabel: "Add Race" },
    soldierType: { label: "Soldier Type", noneLabel: "None", addLabel: "Add Soldier Type" },
  }[type];
  const selected = owned.find((item) => item.active) ?? null;
  return {
    type,
    ...labels,
    options: owned.map((item) => ({ value: item.id, label: item.name })),
    selectedId: selected?.id ?? "",
    selectedImg: selected ? (selected.img ?? "icons/svg/item-bag.svg") : null,
  };
}

export type DashboardContextOverrides = {
  races?: CompositionItemFixture[];
  soldierTypes?: CompositionItemFixture[];
  actor?: {
    img?: string;
    name?: string;
    system?: DeepPartial<PcSystem>;
  };
  drCategories?: DrCategoryFixture[];
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
        characteristics: overrides.actor?.system?.characteristics ?? defaultCharacteristics(),
        mythicCharacteristics: overrides.actor?.system?.mythicCharacteristics ?? {},
        initiative: overrides.actor?.system?.initiative ?? { value: 0, contributions: [] },
        wounds: overrides.actor?.system?.wounds ?? { value: 0, max: 0, temp: 0, contributions: [] },
        fatigue: overrides.actor?.system?.fatigue ?? { value: 0, max: 0, penalty: 0, contributions: [] },
        luck: overrides.actor?.system?.luck ?? { value: 0, max: 0, contributions: [] },
        movement: overrides.actor?.system?.movement ?? { mode: "land", base: defaultMovementBase() },
      },
    },
    compositionSelectors: [
      buildCompositionSelector("race", overrides.races),
      buildCompositionSelector("soldierType", overrides.soldierTypes),
    ],
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
