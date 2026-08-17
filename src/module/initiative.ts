import { type Contributions, contributionsField } from "./contribution.js";

export type Initiative = {
  value: number;
  contributions: Contributions;
};

export function initiativeField(): foundry.data.fields.SchemaField {
  const { SchemaField, NumberField } = foundry.data.fields;
  return new SchemaField({
    value: new NumberField({ required: true, initial: 0, integer: true }),
    contributions: contributionsField(),
  });
}
