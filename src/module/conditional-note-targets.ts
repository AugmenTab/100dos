import type { StaticConditionalNoteTarget } from "./change.js";
import type { ActorContext } from "./change-targets.js";

export type ConditionalNoteTargetCategoryId =
  | "characteristicTests"
  | "attack"
  | "defense"
  | "miscellaneous"
  | "skills"
  | "speed";

export type ConditionalNoteTargetEntry = {
  target: string;
  label: string;
};

export type ConditionalNoteTargetCategory = {
  id: ConditionalNoteTargetCategoryId;
  label: string;
  targets: ConditionalNoteTargetEntry[];
};

type StaticCategoryDef = {
  id: ConditionalNoteTargetCategoryId;
  labelKey: string;
  targets: readonly StaticConditionalNoteTarget[];
};

const STATIC_CATEGORY_DEFS: readonly StaticCategoryDef[] = [
  {
    id: "characteristicTests",
    labelKey: "DOS100.item.changeTargetCategory.characteristicTests",
    targets: [
      "allCharacteristicTests",
      "strTests", "touTests", "agiTests", "wfrTests", "wfmTests",
      "intTests", "perTests", "crgTests", "chaTests", "ldrTests",
    ],
  },
  {
    id: "attack",
    labelKey: "DOS100.item.changeTargetCategory.attack",
    targets: [
      "allAttacks", "weaponAttacks", "meleeAttacks", "naturalAttacks",
      "rangedAttacks", "thrownAttacks", "allInboundAttacks",
    ],
  },
  {
    id: "defense",
    labelKey: "DOS100.item.changeTargetCategory.defense",
    targets: ["damageResistance", "energyShields"],
  },
  {
    id: "miscellaneous",
    labelKey: "DOS100.item.changeTargetCategory.miscellaneous",
    targets: ["initiative"],
  },
  {
    id: "skills",
    labelKey: "DOS100.item.changeTargetCategory.skills",
    targets: ["allSkills", "untrainedSkills", "basicSkills", "advancedSkills"],
  },
  {
    id: "speed",
    labelKey: "DOS100.item.changeTargetCategory.speed",
    targets: ["allSpeeds", "land", "climb", "swim", "flight", "burrow"],
  },
];

export function buildConditionalNoteTargetCategories(
  localize: (key: string) => string,
  actor: ActorContext = null,
): ConditionalNoteTargetCategory[] {
  return STATIC_CATEGORY_DEFS.map(def => {
    const targets: ConditionalNoteTargetEntry[] = def.targets.map(t => ({
      target: t,
      label: localize(`DOS100.item.conditionalNoteTarget.${t}`),
    }));

    if (def.id === "skills" && actor?.system.skills) {
      const dynamic = Object.entries(actor.system.skills)
        .map(([key, skill]) => ({ target: `skill:${key}`, label: skill.name }))
        .sort((a, b) => a.label.localeCompare(b.label));
      targets.push(...dynamic);
    }

    return {
      id: def.id,
      label: localize(def.labelKey),
      targets,
    };
  });
}

export function findCategoryForConditionalNoteTarget(
  target: string,
  categories: ConditionalNoteTargetCategory[],
): ConditionalNoteTargetCategoryId | null {
  for (const category of categories) {
    if (category.targets.some(t => t.target === target)) {
      return category.id;
    }
  }
  return null;
}

export function resolveConditionalNoteTargetLabel(
  target: string,
  localize: (key: string) => string,
  actor: ActorContext = null,
): string {
  if (!target) return localize("DOS100.item.changeEditor.targetNone");
  if (target.startsWith("skill:")) {
    const key = target.slice("skill:".length);
    return actor?.system.skills?.[key]?.name ?? target;
  }
  return localize(`DOS100.item.conditionalNoteTarget.${target}`);
}
