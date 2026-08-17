export type Xp = {
  earned: number;
  tier: number;
};

export function xpField(): foundry.data.fields.SchemaField {
  const { SchemaField, NumberField } = foundry.data.fields;
  return new SchemaField({
    earned: new NumberField({ required: true, initial: 0, integer: true }),
    // TODO: derived from `earned` by a formula that doesn't exist yet.
    // Defaults to 0 until that calculation is implemented.
    tier: new NumberField({ required: true, initial: 0, integer: true }),
  });
}
