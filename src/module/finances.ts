export type FinanceTransactionType = "income" | "purchase";

export type FinanceLedgerItem = {
  id: string;
  type: FinanceTransactionType;
  description: string;
  value: number;
  recordedBy: string | null;
  worldTime: number | null;
  realTime: number;
};

export type Finances = {
  received: number;
  spent: number;
  available: number;
  ledger: FinanceLedgerItem[];
};

function financeLedgerItemField(): foundry.data.fields.SchemaField {
  const { SchemaField, StringField, NumberField } = foundry.data.fields;
  return new SchemaField({
    // No generation behavior (id) or capture behavior (recordedBy/worldTime/
    // realTime) yet — transaction creation is out of scope for this
    // wireframe (see .local/plan.md).
    id: new StringField({ required: true, initial: "" }),
    type: new StringField({ required: true, initial: "income", choices: ["income", "purchase"] }),
    description: new StringField({ required: true, initial: "" }),
    value: new NumberField({ required: true, initial: 0, integer: true }),
    recordedBy: new StringField({ required: true, nullable: true, initial: null }),
    worldTime: new NumberField({ required: true, nullable: true, initial: null }),
    realTime: new NumberField({ required: true, initial: 0 }),
  });
}

// TODO: received/spent/available are unrelated placeholders (default 0)
// until a calculation system derives them from the ledger — no calculation
// exists yet (wireframe only, see .local/plan.md).
export function financesField(): foundry.data.fields.SchemaField {
  const { SchemaField, NumberField, ArrayField } = foundry.data.fields;
  return new SchemaField({
    received: new NumberField({ required: true, initial: 0, integer: true }),
    spent: new NumberField({ required: true, initial: 0, integer: true }),
    available: new NumberField({ required: true, initial: 0, integer: true }),
    ledger: new ArrayField(financeLedgerItemField(), { required: true, initial: [] }),
  });
}
