import { type Changes, changesField } from "../change.js";

const { BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

export type DurationUnit = "round" | "minute" | "hour";

export type StackingRule = "replace" | "extend";

export type EffectDuration = {
  formula: string;
  value: number;
  unit: DurationUnit;
};

export type EffectData = {
  active: boolean;
  duration: EffectDuration;
  stackingRule: StackingRule;
  changes: Changes;
  description: string;
};

export const DURATION_UNITS: Record<DurationUnit, string> = {
  round: "DOS100.effect.duration.units.round",
  minute: "DOS100.effect.duration.units.minute",
  hour: "DOS100.effect.duration.units.hour",
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
      }),
      stackingRule: new StringField({ required: true, initial: "replace" }),
      changes: changesField(),
      description: new StringField({ required: true, initial: "" }),
    };
  }
}
