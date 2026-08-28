import type { StaticChangeTarget } from "./change.js";

export type ChangeTargetCategoryId =
  | "characteristicTests"
  | "characteristics"
  | "attack"
  | "damage"
  | "defense"
  | "health"
  | "miscellaneous"
  | "skills"
  | "speed";

export type ChangeTargetEntry = {
  target: string;
  label: string;
};

export type ChangeTargetCategory = {
  id: ChangeTargetCategoryId;
  label: string;
  targets: ChangeTargetEntry[];
};

export type ActorContext = {
  system: {
    skills?: Record<string, { name: string }>;
    dr?: Record<string, { label: string }>;
  };
} | null;

type StaticCategoryDef = {
  id: ChangeTargetCategoryId;
  labelKey: string;
  targets: readonly StaticChangeTarget[];
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
    id: "characteristics",
    labelKey: "DOS100.item.changeTargetCategory.characteristics",
    targets: [
      "str", "tou", "agi", "wfr", "wfm", "int", "per", "crg", "cha", "ldr",
      "strModifier", "touModifier", "agiModifier", "wfrModifier", "wfmModifier",
      "intModifier", "perModifier", "crgModifier", "chaModifier", "ldrModifier",
    ],
  },
  {
    id: "attack",
    labelKey: "DOS100.item.changeTargetCategory.attack",
    targets: [
      "allAttacks", "weaponAttacks", "meleeAttacks", "naturalAttacks", "rangedAttacks", "thrownAttacks",
      "allInboundAttacks", "inboundWeaponAttacks", "inboundMeleeAttacks", "inboundNaturalAttacks",
      "inboundRangedAttacks", "inboundThrownAttacks",
    ],
  },
  {
    id: "damage",
    labelKey: "DOS100.item.changeTargetCategory.damage",
    targets: [
      "allDamage", "weaponDamage", "meleeWeaponDamage", "naturalAttackDamage",
      "rangedWeaponDamage", "thrownWeaponDamage", "allMeleeDamage", "allRangedDamage",
      "allInboundDamage", "inboundWeaponDamage", "inboundMeleeWeaponDamage",
      "inboundNaturalAttackDamage", "inboundRangedWeaponDamage", "inboundThrownWeaponDamage",
      "allInboundMeleeDamage", "allInboundRangedDamage",
    ],
  },
  {
    id: "defense",
    labelKey: "DOS100.item.changeTargetCategory.defense",
    targets: [
      "allDamageResistance", "allHeadDamageResistance", "allTorsoDamageResistance",
      "allArmDamageResistance", "allLegDamageResistance", "allWingDamageResistance",
      "allTailDamageResistance", "energyShieldIntegrity", "energyShieldDelay", "energyShieldRechargeRate",
    ],
  },
  {
    id: "health",
    labelKey: "DOS100.item.changeTargetCategory.health",
    targets: ["wounds", "fatigue"],
  },
  {
    id: "miscellaneous",
    labelKey: "DOS100.item.changeTargetCategory.miscellaneous",
    targets: ["luck", "size", "reach", "initiative", "carryWeight"],
  },
  {
    id: "skills",
    labelKey: "DOS100.item.changeTargetCategory.skills",
    targets: [
      "allSkills", "untrainedSkills", "basicSkills", "advancedSkills",
      "strSkills", "touSkills", "agiSkills", "wfrSkills", "wfmSkills",
      "intSkills", "perSkills", "crgSkills", "chaSkills", "ldrSkills",
    ],
  },
  {
    id: "speed",
    labelKey: "DOS100.item.changeTargetCategory.speed",
    targets: [
      "allSpeeds",
      "allLandSpeeds", "landHalf", "landFull", "landCharge", "landRun", "landSprint",
      "jump", "leap", "climb", "swim",
      "allClimbSpeeds", "climbHalf", "climbFull", "climbCharge", "climbRun", "climbSprint",
      "allSwimSpeeds", "swimHalf", "swimFull", "swimCharge", "swimRun", "swimSprint",
      "allFlightSpeeds", "flightHalf", "flightFull", "flightCharge", "flightRun", "flightSprint",
      "allBurrowSpeeds", "burrowHalf", "burrowFull", "burrowCharge", "burrowRun", "burrowSprint",
    ],
  },
];

export function buildChangeTargetCategories(
  localize: (key: string) => string,
  actor: ActorContext = null,
): ChangeTargetCategory[] {
  return STATIC_CATEGORY_DEFS.map(def => {
    const targets: ChangeTargetEntry[] = def.targets.map(t => ({
      target: t,
      label: localize(`DOS100.item.changeTarget.${t}`),
    }));

    if (def.id === "skills" && actor?.system.skills) {
      const dynamic = Object.entries(actor.system.skills)
        .map(([key, skill]) => ({ target: `skill:${key}`, label: skill.name }))
        .sort((a, b) => a.label.localeCompare(b.label));
      targets.push(...dynamic);
    }

    if (def.id === "defense" && actor?.system.dr) {
      const dynamic = Object.entries(actor.system.dr)
        .map(([key, loc]) => ({ target: `drLocation:${key}`, label: `${loc.label} Damage Resistance` }))
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

export function findCategoryForTarget(
  target: string,
  categories: ChangeTargetCategory[],
): ChangeTargetCategoryId | null {
  for (const category of categories) {
    if (category.targets.some(t => t.target === target)) {
      return category.id;
    }
  }
  return null;
}

export function resolveTargetLabel(
  target: string,
  localize: (key: string) => string,
  actor: ActorContext = null,
): string {
  if (!target) return localize("DOS100.item.changeEditor.targetNone");
  if (target.startsWith("skill:")) {
    const key = target.slice("skill:".length);
    return actor?.system.skills?.[key]?.name ?? target;
  }
  if (target.startsWith("drLocation:")) {
    const key = target.slice("drLocation:".length);
    const loc = actor?.system.dr?.[key];
    return loc ? `${loc.label} Damage Resistance` : target;
  }
  return localize(`DOS100.item.changeTarget.${target}`);
}
