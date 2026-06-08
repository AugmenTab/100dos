export type ChangeMode = "add" | "set";

export type ChangeSourceRef = {
  id: string;
  name: string;
};

export type ChangeData = {
  readonly id: string;
  enabled: boolean;
  target: string;
  mode: ChangeMode;
  formula: string;
  source: ChangeSourceRef;
};

export type ConditionalChangeData = {
  readonly id: string;
  enabled: boolean;
  target: string;
  value: string;
  source: ChangeSourceRef;
};

export type Changes = {
  computed: ChangeData[];
  conditional: ConditionalChangeData[];
};

export function changesField(): foundry.data.fields.SchemaField {
  const { SchemaField, ArrayField, BooleanField, StringField } = foundry.data.fields;
  const sourceSchema = () =>
    new SchemaField({
      id: new StringField({ required: true, initial: "" }),
      name: new StringField({ required: true, initial: "" }),
    });
  return new SchemaField({
    computed: new ArrayField(
      new SchemaField({
        id: new StringField({ required: true, initial: () => foundry.utils.randomID() }),
        enabled: new BooleanField({ required: true, initial: true }),
        target: new StringField({ required: true, initial: "" }),
        mode: new StringField({ required: true, initial: "add" }),
        formula: new StringField({ required: true, initial: "" }),
        source: sourceSchema(),
      }),
    ),
    conditional: new ArrayField(
      new SchemaField({
        id: new StringField({ required: true, initial: () => foundry.utils.randomID() }),
        enabled: new BooleanField({ required: true, initial: true }),
        target: new StringField({ required: true, initial: "" }),
        value: new StringField({ required: true, initial: "" }),
        source: sourceSchema(),
      }),
    ),
  });
}
