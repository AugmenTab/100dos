const { SchemaField, ArrayField, StringField, ObjectField } = foundry.data.fields;

export type GrantKind = "child" | "supplement";

export type GrantData = {
  readonly id: string;
  kind: GrantKind;
  type: string;
  name: string;
  system: Record<string, unknown>;
};

export function grantsField(): foundry.data.fields.ArrayField {
  return new ArrayField(
    new SchemaField({
      id: new StringField({ required: true, initial: () => foundry.utils.randomID() }),
      kind: new StringField({ required: true, initial: "child", choices: ["child", "supplement"] }),
      type: new StringField({ required: true, initial: "" }),
      name: new StringField({ required: true, initial: "" }),
      system: new ObjectField({ required: true, initial: {} }),
    }),
  );
}
