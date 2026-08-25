export type ChangeMode = "add" | "set";

// TODO: The fixed vocabulary of things a Change/Conditional can target, each
// meant to localize to a short display label (DOS100.item.changeTarget.*)
// rather than rendering a raw path — a flat identifier, not a dotted path,
// so it drops directly into the project's usual
// {{localize (concat "DOS100.x.y." this.z)}} idiom without forming an
// unintended nested key. Only one member exists so far — there's no
// complete picture of the full target domain yet — so this grows as real
// targets are identified, the same way ChangeMode is a closed set rather
// than a bare string.
export type ChangeTarget = "strMod";

export type ChangeSourceRef = {
  id: string;
  name: string;
};

export type ChangeData = {
  readonly id: string;
  enabled: boolean;
  target: ChangeTarget;
  mode: ChangeMode;
  formula: string;
  source: ChangeSourceRef;
};

export type ConditionalChangeData = {
  readonly id: string;
  enabled: boolean;
  target: ChangeTarget;
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
