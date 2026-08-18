export type Basic = {
  height: string;
  weight: string;
  age: string;
  gender: string;
};

export function basicField(): foundry.data.fields.SchemaField {
  const { SchemaField, StringField } = foundry.data.fields;
  return new SchemaField({
    height: new StringField({ required: true, initial: "" }),
    weight: new StringField({ required: true, initial: "" }),
    age: new StringField({ required: true, initial: "" }),
    gender: new StringField({ required: true, initial: "" }),
  });
}
