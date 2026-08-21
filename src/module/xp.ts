export type ExperienceTransactionType = "reward" | "purchase";

export type ExperienceLedgerItem = {
  id: string;
  type: ExperienceTransactionType;
  description: string;
  value: number;
  recordedBy: string | null;
  worldTime: number | null;
  realTime: number;
};

export type ExperienceLedger = {
  tier: number;
  earned: number;
  spent: number;
  available: number;
  ledger: ExperienceLedgerItem[];
};

function experienceLedgerItemField(): foundry.data.fields.SchemaField {
  const { SchemaField, StringField, NumberField } = foundry.data.fields;
  return new SchemaField({
    id: new StringField({ required: true, initial: () => foundry.utils.randomID() }),
    type: new StringField({ required: true, initial: "reward", choices: ["reward", "purchase"] }),
    description: new StringField({ required: true, initial: "" }),
    value: new NumberField({ required: true, initial: 0, integer: true }),
    recordedBy: new StringField({ required: true, nullable: true, initial: null }),
    worldTime: new NumberField({ required: true, nullable: true, initial: null }),
    realTime: new NumberField({ required: true, initial: () => Date.now() }),
  });
}

// TODO: tier/earned/spent/available are unrelated placeholders (default 0)
// until a calculation system derives tier from earned, and earned/spent/
// available from the ledger — no calculation exists yet (wireframe only).
export function experienceLedgerField(): foundry.data.fields.SchemaField {
  const { SchemaField, NumberField, ArrayField } = foundry.data.fields;
  return new SchemaField({
    tier: new NumberField({ required: true, initial: 0, integer: true }),
    earned: new NumberField({ required: true, initial: 0, integer: true }),
    spent: new NumberField({ required: true, initial: 0, integer: true }),
    available: new NumberField({ required: true, initial: 0, integer: true }),
    ledger: new ArrayField(experienceLedgerItemField(), { required: true, initial: [] }),
  });
}
