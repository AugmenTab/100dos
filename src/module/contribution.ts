export type Contribution = {
  label: string;
  value: number;
};

export type Contributions = Contribution[];

export function contributionsField(): foundry.data.fields.ArrayField {
  const { ArrayField, SchemaField, StringField, NumberField } = foundry.data.fields;
  return new ArrayField(
    new SchemaField({
      label: new StringField({ required: true, initial: "" }),
      value: new NumberField({ required: true, initial: 0, integer: true }),
    }),
    { required: true, initial: [] },
  );
}
