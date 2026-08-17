import { type Contributions, contributionsField } from "./contribution.js";

export type Luck = {
  value: number;
  max: number;
  contributions: Contributions;
};

export function luckField(): foundry.data.fields.SchemaField {
  const { SchemaField, NumberField } = foundry.data.fields;
  return new SchemaField({
    value: new NumberField({ required: true, initial: 0, integer: true }),
    max: new NumberField({ required: true, initial: 0, integer: true }),
    contributions: contributionsField(),
  });
}
