const { SchemaField, ArrayField, StringField, ObjectField } = foundry.data.fields;

export type GrantData = {
  readonly id: string;
  type: string;
  name: string;
  system: Record<string, unknown>;
};

export function grantsField(): foundry.data.fields.ArrayField {
  return new ArrayField(
    new SchemaField({
      id: new StringField({ required: true, initial: () => foundry.utils.randomID() }),
      type: new StringField({ required: true, initial: "" }),
      name: new StringField({ required: true, initial: "" }),
      system: new ObjectField({ required: true, initial: {} }),
    }),
  );
}
