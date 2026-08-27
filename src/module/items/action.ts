export type ActivationType =
  | "passive"
  | "free"
  | "half"
  | "full"
  | "reaction"
  | "attack"
  | "turn"
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
  formula: {
    max: string;
  };
};

export type ActionUses = {
  per: UsagePeriod;
  value: number;
  max: number;
  cost: number;
  formula: {
    max: string;
    cost: string;
  };
};

export type ActionData = {
  readonly id: string;
  name: string;
  activation: {
    type: ActivationType;
    cost: number | null;
  };
  uses: ActionUses;
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

// Activation types for which the cost field is meaningless and hidden in the UI.
export const COST_HIDDEN_TYPES = new Set<ActivationType>(["passive", "free", "reaction"]);

// Numeric rank for time-based usage periods. Higher rank = longer period.
// "encounter" and "charges" are outside this ordering and handled explicitly.
const USAGE_PERIOD_RANK: Partial<Record<UsagePeriod, number>> = {
  minute: 0,
  hour: 1,
  day: 2,
};

export const ACTIVATION_TYPES: Record<ActivationType, string> = {
  passive: "DOS100.action.activation.types.passive",
  free: "DOS100.action.activation.types.free",
  half: "DOS100.action.activation.types.half",
  full: "DOS100.action.activation.types.full",
  reaction: "DOS100.action.activation.types.reaction",
  attack: "DOS100.action.activation.types.attack",
  turn: "DOS100.action.activation.types.turn",
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
      formula: new SchemaField({
        max: new StringField({ required: true, initial: "" }),
      }),
    }),
    items: new ObjectField({ required: true, initial: {} }),
    pinned: new BooleanField({ required: true, initial: false }),
    notes: new SchemaField({
      effectNotes: new ArrayField(new StringField({ required: true })),
      footnotes: new ArrayField(new StringField({ required: true })),
    }),
  });
}
