export type WeightValue = {
  each: number;
  total: number;
};

export type Weight = {
  felt: WeightValue;
  actual: WeightValue;
};

export function weightField(): foundry.data.fields.SchemaField {
  const { SchemaField, NumberField } = foundry.data.fields;
  const valueField = () =>
    new SchemaField({
      each: new NumberField({ required: true, initial: 0, min: 0 }),
      total: new NumberField({ required: true, initial: 0, min: 0 }),
    });
  return new SchemaField({
    felt: valueField(),
    actual: valueField(),
  });
}
