import type { CharacteristicId } from "../characteristic.js";

export type ActionType =
  | "meleeAttack"
  | "rangedAttack"
  | "thrownAttack"
  | "healing"
  | "other";

export type AttackHeld = "default" | "oneHanded" | "twoHanded";

export type ActionAttack = {
  name: string;
  held: AttackHeld;
  characteristic: CharacteristicId;
  bonus: string;
  critical: {
    success: number;
    failure: number;
  };
};

export const ACTION_TYPES: Record<ActionType, string> = {
  meleeAttack: "DOS100.action.type.meleeAttack",
  rangedAttack: "DOS100.action.type.rangedAttack",
  thrownAttack: "DOS100.action.type.thrownAttack",
  healing: "DOS100.action.type.healing",
  other: "DOS100.action.type.other",
};

export type ActivationType =
  | "nonaction"
  | "passive"
  | "free"
  | "half"
  | "full"
  | "reaction"
  | "attack"
  | "round"
  | "minute"
  | "hour"
  | "special";

export type UsagePeriod =
  | "unlimited"
  | "encounter"
  | "day"
  | "minute"
  | "hour"
  | "charges";

export type ActionsPoolUses = {
  per: UsagePeriod;
  value: number;
  max: number;
  formula: string;
};

export type ChargeCost = {
  value: number;
  formula: string;
  perAttack: boolean;
};

export type ActionUses = {
  per: UsagePeriod;
  value: number;
  max: number;
  formula: string;
  itemCost: ChargeCost;
  actionCost: ChargeCost;
};

export type ActionActivation = {
  type: ActivationType;
  cost: number | null;
};

export type ActionRangeType =
  | "none"
  | "personal"
  | "touch"
  | "melee"
  | "meters"
  | "special"
  | "seeText"
  | "unlimited";

export type ActionRange = {
  type: ActionRangeType;
  value: string;
};

export type ActionDurationType =
  | "na"
  | "instantaneous"
  | "round"
  | "minute"
  | "hour"
  | "day"
  | "month"
  | "year"
  | "permanent"
  | "seeText"
  | "special";

export type ActionDuration = {
  type: ActionDurationType;
  value: string;
};

export type ActionData = {
  readonly id: string;
  img: string;
  name: string;
  identifier: string;
  type: ActionType;
  description: string;
  activation: ActionActivation;
  target: string;
  range: ActionRange;
  area: string;
  duration: ActionDuration;
  concentration: boolean;
  dismissible: boolean;
  uses: ActionUses;
  notes: ActionNotes;
  attack?: ActionAttack;
};

export type ActionNotes = {
  effectNotes: string[];
  footnotes: string[];
};

export type Actions = {
  uses: ActionsPoolUses;
  items: Record<string, ActionData>;
  pinned: boolean;
  notes: ActionNotes;
};

// Action types that expose the Attack section.
export const ATTACK_ACTION_TYPES = new Set<ActionType>(["meleeAttack", "rangedAttack", "thrownAttack"]);

export const HELD_TYPES: Record<AttackHeld, string> = {
  default: "DOS100.action.attack.held.default",
  oneHanded: "DOS100.action.attack.held.oneHanded",
  twoHanded: "DOS100.action.attack.held.twoHanded",
};

export const ATTACK_CHARACTERISTIC_DEFAULTS: Partial<Record<ActionType, CharacteristicId>> = {
  meleeAttack: "wfm",
  rangedAttack: "wfr",
  thrownAttack: "wfm",
};

export const CRITICAL_SUCCESS_MIN = 1;
export const CRITICAL_SUCCESS_MAX = 10;
export const CRITICAL_FAILURE_MIN = 90;
export const CRITICAL_FAILURE_MAX = 100;

// Activation types for which the cost field is meaningless and hidden in the UI.
export const COST_HIDDEN_TYPES = new Set<ActivationType>(["nonaction", "passive", "free", "half", "full", "reaction", "special"]);

// Range types that expose a value/formula field.
export const RANGE_VALUE_TYPES = new Set<ActionRangeType>(["meters", "special"]);

// Duration types that expose a value/formula field.
export const DURATION_VALUE_TYPES = new Set<ActionDurationType>(["round", "minute", "hour", "day", "month", "year", "special"]);

export const RANGE_TYPES: Record<ActionRangeType, string> = {
  none: "DOS100.action.range.types.none",
  personal: "DOS100.action.range.types.personal",
  touch: "DOS100.action.range.types.touch",
  melee: "DOS100.action.range.types.melee",
  meters: "DOS100.action.range.types.meters",
  special: "DOS100.action.range.types.special",
  seeText: "DOS100.action.range.types.seeText",
  unlimited: "DOS100.action.range.types.unlimited",
};

export const DURATION_TYPES: Record<ActionDurationType, string> = {
  na: "DOS100.action.duration.types.na",
  instantaneous: "DOS100.action.duration.types.instantaneous",
  round: "DOS100.action.duration.types.round",
  minute: "DOS100.action.duration.types.minute",
  hour: "DOS100.action.duration.types.hour",
  day: "DOS100.action.duration.types.day",
  month: "DOS100.action.duration.types.month",
  year: "DOS100.action.duration.types.year",
  permanent: "DOS100.action.duration.types.permanent",
  seeText: "DOS100.action.duration.types.seeText",
  special: "DOS100.action.duration.types.special",
};

// Numeric rank for time-based usage periods. Higher rank = longer period.
// "encounter" and "charges" are outside this ordering and handled explicitly.
const USAGE_PERIOD_RANK: Partial<Record<UsagePeriod, number>> = {
  minute: 0,
  hour: 1,
  day: 2,
};

export const ACTIVATION_TYPES: Record<ActivationType, string> = {
  nonaction: "DOS100.action.activation.types.nonaction",
  passive: "DOS100.action.activation.types.passive",
  free: "DOS100.action.activation.types.free",
  half: "DOS100.action.activation.types.half",
  full: "DOS100.action.activation.types.full",
  reaction: "DOS100.action.activation.types.reaction",
  attack: "DOS100.action.activation.types.attack",
  round: "DOS100.action.activation.types.round",
  minute: "DOS100.action.activation.types.minute",
  hour: "DOS100.action.activation.types.hour",
  special: "DOS100.action.activation.types.special",
};

export const USAGE_PERIODS: Record<UsagePeriod, string> = {
  unlimited: "DOS100.action.uses.periods.unlimited",
  encounter: "DOS100.action.uses.periods.encounter",
  day: "DOS100.action.uses.periods.day",
  minute: "DOS100.action.uses.periods.minute",
  hour: "DOS100.action.uses.periods.hour",
  charges: "DOS100.action.uses.periods.charges",
};

/**
 * Returns true if the given recharge trigger should restore an action whose
 * uses replenish on the given period. Time-based periods cascade downward:
 * triggering "day" also restores "hour" and "minute" actions. "encounter"
 * period restores from the encounter trigger and from "day". "charges" never
 * auto-recharges.
 */
export function shouldRecharge(
  trigger: UsagePeriod | "encounter",
  actionPeriod: UsagePeriod,
): boolean {
  if (actionPeriod === "unlimited" || actionPeriod === "charges") return false;

  // Encounter period: restores on encounter trigger or on daily refill.
  if (actionPeriod === "encounter") return trigger === "encounter" || trigger === "day";

  // Encounter trigger only restores encounter-period actions (handled above).
  if (trigger === "encounter") return false;

  const triggerRank = USAGE_PERIOD_RANK[trigger as UsagePeriod];
  const actionRank = USAGE_PERIOD_RANK[actionPeriod];
  if (triggerRank === undefined || actionRank === undefined) return false;
  return triggerRank >= actionRank;
}

export function actionsField(): foundry.data.fields.SchemaField {
  const { SchemaField, ArrayField, ObjectField, NumberField, StringField, BooleanField } = foundry.data.fields;
  return new SchemaField({
    uses: new SchemaField({
      per: new StringField({ required: true, initial: "unlimited" }),
      value: new NumberField({ required: true, initial: 0, integer: true, min: 0 }),
      max: new NumberField({ required: true, initial: 0, integer: true, min: 0 }),
      formula: new StringField({ required: true, initial: "" }),
    }),
    items: new ObjectField({ required: true, initial: {} }),
    pinned: new BooleanField({ required: true, initial: false }),
    notes: new SchemaField({
      effectNotes: new ArrayField(new StringField({ required: true })),
      footnotes: new ArrayField(new StringField({ required: true })),
    }),
  });
}
