import { type Changes, changesField } from "../change.js";
import { type Actions, actionsField } from "./action.js";

const { BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

export type DurationUnit = "round" | "minute" | "hour";

export type StackingRule = "replace" | "extend";

// Whether a completed duration expires at the start or end of the relevant
// Actor's turn, for rules that distinguish the two. null when the
// distinction doesn't apply. TODO: automatic expiration timing is not
// implemented; this only records the distinction.
export type EffectExpiration = "startOfTurn" | "endOfTurn";

export type EffectDuration = {
  formula: string;
  value: number;
  unit: DurationUnit;
  expiration: EffectExpiration | null;
};

export type EffectData = {
  active: boolean;
  duration: EffectDuration;
  stackingRule: StackingRule;
  // Whether the Effect itself should be removed from the Actor once its
  // duration expires, rather than retained as inactive data — deliberately
  // not an EffectPersistence enum. TODO: automatic deletion-on-expiration
  // is not implemented here.
  deleteOnExpire: boolean;
  changes: Changes;
  actions: Actions;
  description: string;
};

export const DURATION_UNITS: Record<DurationUnit, string> = {
  round: "DOS100.effect.duration.units.round",
  minute: "DOS100.effect.duration.units.minute",
  hour: "DOS100.effect.duration.units.hour",
};

export const EFFECT_EXPIRATIONS: Record<EffectExpiration, string> = {
  startOfTurn: "DOS100.effect.duration.expiration.startOfTurn",
  endOfTurn: "DOS100.effect.duration.expiration.endOfTurn",
};

export const STACKING_RULES: Record<StackingRule, string> = {
  replace: "DOS100.effect.stackingRule.replace",
  extend: "DOS100.effect.stackingRule.extend",
};

export class EffectDataModel extends foundry.abstract.TypeDataModel {
  static override defineSchema() {
    return {
      active: new BooleanField({ required: true, initial: false }),
      duration: new SchemaField({
        formula: new StringField({ required: true, initial: "" }),
        value: new NumberField({ required: true, initial: 0, integer: true, min: 0 }),
        unit: new StringField({ required: true, initial: "round" }),
        expiration: new StringField({
          required: true,
          nullable: true,
          initial: null,
          choices: ["startOfTurn", "endOfTurn"],
        }),
      }),
      stackingRule: new StringField({ required: true, initial: "replace" }),
      deleteOnExpire: new BooleanField({ required: true, initial: false }),
      changes: changesField(),
      actions: actionsField(),
      description: new StringField({ required: true, initial: "" }),
    };
  }
}
