export type ChangeMode = "add" | "set";

export type StaticChangeTarget =
  // Characteristic Tests
  | "allCharacteristicTests"
  | "strTests"
  | "touTests"
  | "agiTests"
  | "wfrTests"
  | "wfmTests"
  | "intTests"
  | "perTests"
  | "crgTests"
  | "chaTests"
  | "ldrTests"

  // Characteristics
  | "str"
  | "tou"
  | "agi"
  | "wfr"
  | "wfm"
  | "int"
  | "per"
  | "crg"
  | "cha"
  | "ldr"
  | "strModifier"
  | "touModifier"
  | "agiModifier"
  | "wfrModifier"
  | "wfmModifier"
  | "intModifier"
  | "perModifier"
  | "crgModifier"
  | "chaModifier"
  | "ldrModifier"

  // Attack
  | "allAttacks"
  | "weaponAttacks"
  | "meleeAttacks"
  | "naturalAttacks"
  | "rangedAttacks"
  | "thrownAttacks"
  | "allInboundAttacks"
  | "inboundWeaponAttacks"
  | "inboundMeleeAttacks"
  | "inboundNaturalAttacks"
  | "inboundRangedAttacks"
  | "inboundThrownAttacks"

  // Damage
  | "allDamage"
  | "weaponDamage"
  | "meleeWeaponDamage"
  | "naturalAttackDamage"
  | "rangedWeaponDamage"
  | "thrownWeaponDamage"
  | "allMeleeDamage"
  | "allRangedDamage"
  | "allInboundDamage"
  | "inboundWeaponDamage"
  | "inboundMeleeWeaponDamage"
  | "inboundNaturalAttackDamage"
  | "inboundRangedWeaponDamage"
  | "inboundThrownWeaponDamage"
  | "allInboundMeleeDamage"
  | "allInboundRangedDamage"

  // Defense
  | "allDamageResistance"
  | "allHeadDamageResistance"
  | "allTorsoDamageResistance"
  | "allArmDamageResistance"
  | "allLegDamageResistance"
  | "allWingDamageResistance"
  | "allTailDamageResistance"
  | "energyShieldIntegrity"
  | "energyShieldDelay"
  | "energyShieldRechargeRate"

  // Health
  | "wounds"
  | "fatigue"

  // Miscellaneous
  | "luck"
  | "size"
  | "reach"
  | "initiative"
  | "carryWeight"

  // Skills
  | "allSkills"
  | "untrainedSkills"
  | "basicSkills"
  | "advancedSkills"
  | "strSkills"
  | "touSkills"
  | "agiSkills"
  | "wfrSkills"
  | "wfmSkills"
  | "intSkills"
  | "perSkills"
  | "crgSkills"
  | "chaSkills"
  | "ldrSkills"

  // Speed
  | "allSpeeds"
  | "allLandSpeeds"
  | "landHalf"
  | "landFull"
  | "landCharge"
  | "landRun"
  | "landSprint"
  | "jump"
  | "leap"
  | "climb"
  | "swim"
  | "allClimbSpeeds"
  | "climbHalf"
  | "climbFull"
  | "climbCharge"
  | "climbRun"
  | "climbSprint"
  | "allSwimSpeeds"
  | "swimHalf"
  | "swimFull"
  | "swimCharge"
  | "swimRun"
  | "swimSprint"
  | "allFlightSpeeds"
  | "flightHalf"
  | "flightFull"
  | "flightCharge"
  | "flightRun"
  | "flightSprint"
  | "allBurrowSpeeds"
  | "burrowHalf"
  | "burrowFull"
  | "burrowCharge"
  | "burrowRun"
  | "burrowSprint";

export type SkillChangeTarget = `skill:${string}`;
export type DrLocationChangeTarget = `drLocation:${string}`;

export type DynamicChangeTarget =
  | SkillChangeTarget
  | DrLocationChangeTarget;

// A Change target is a constrained identifier, not a dotted data path — each
// value maps to a localization key (DOS100.item.changeTarget.*) for display.
// Dynamic targets use a namespaced prefix (skill:, drLocation:) with the
// stable keyed identity of the relevant Actor data as the suffix.
export type ChangeTarget =
  | StaticChangeTarget
  | DynamicChangeTarget;

export type ChangeSourceRef = {
  id: string;
  name: string;
};

export type ChangeData = {
  readonly id: string;
  enabled: boolean;
  target: ChangeTarget;
  mode: ChangeMode;
  formula: string;
  source: ChangeSourceRef;
};

export type ConditionalChangeData = {
  readonly id: string;
  enabled: boolean;
  target: ChangeTarget;
  value: string;
  source: ChangeSourceRef;
};

export type Changes = {
  computed: ChangeData[];
  conditional: ConditionalChangeData[];
};

export function changesField(): foundry.data.fields.SchemaField {
  const { SchemaField, ArrayField, BooleanField, StringField } = foundry.data.fields;
  const sourceSchema = () =>
    new SchemaField({
      id: new StringField({ required: true, initial: "" }),
      name: new StringField({ required: true, initial: "" }),
    });
  return new SchemaField({
    computed: new ArrayField(
      new SchemaField({
        id: new StringField({ required: true, initial: () => foundry.utils.randomID() }),
        enabled: new BooleanField({ required: true, initial: true }),
        target: new StringField({ required: true, initial: "" }),
        mode: new StringField({ required: true, initial: "add" }),
        formula: new StringField({ required: true, initial: "" }),
        source: sourceSchema(),
      }),
    ),
    conditional: new ArrayField(
      new SchemaField({
        id: new StringField({ required: true, initial: () => foundry.utils.randomID() }),
        enabled: new BooleanField({ required: true, initial: true }),
        target: new StringField({ required: true, initial: "" }),
        value: new StringField({ required: true, initial: "" }),
        source: sourceSchema(),
      }),
    ),
  });
}
