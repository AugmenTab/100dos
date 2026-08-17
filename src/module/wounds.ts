import { type Contributions, contributionsField } from "./contribution.js";

export type Wounds = {
  value: number;
  max: number;
  temp: number;
  contributions: Contributions;
};

export function woundsField(): foundry.data.fields.SchemaField {
  const { SchemaField, NumberField } = foundry.data.fields;
  return new SchemaField({
    value: new NumberField({ required: true, initial: 0, integer: true }),
    max: new NumberField({ required: true, initial: 0, integer: true }),
    temp: new NumberField({ required: true, initial: 0, integer: true }),
    contributions: contributionsField(),
  });
}
