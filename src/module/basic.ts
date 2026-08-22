export type Basic = {
  height: string;
  weight: number;
  age: number;
  gender: string;
};

export function basicField(): foundry.data.fields.SchemaField {
  const { SchemaField, StringField, NumberField } = foundry.data.fields;
  return new SchemaField({
    height: new StringField({ required: true, initial: "" }),
    weight: new NumberField({ required: true, initial: 0, min: 0 }),
    age: new NumberField({ required: true, initial: 0, min: 0, integer: true }),
    gender: new StringField({ required: true, initial: "" }),
  });
}
