import { type Contributions, contributionsField } from "./contribution.js";

export type Fatigue = {
  value: number;
  max: number;
  penalty: number;
  contributions: Contributions;
};

export function fatigueField(): foundry.data.fields.SchemaField {
  const { SchemaField, NumberField } = foundry.data.fields;
  return new SchemaField({
    value: new NumberField({ required: true, initial: 0, integer: true }),
    max: new NumberField({ required: true, initial: 0, integer: true }),
    penalty: new NumberField({ required: true, initial: 0, integer: true }),
    contributions: contributionsField(),
  });
}
