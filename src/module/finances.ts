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
  // The combined monetary value of the Actor's currently-carried Items
  // (quantity x unit value, carried Items only) — distinct from available
  // (total wealth) and not ledger-derived. Read by the Inventory tab's
  // carrying-capacity Carried Value cell.
  carried: number;
  ledger: FinanceLedgerItem[];
};

function financeLedgerItemField(): foundry.data.fields.SchemaField {
  const { SchemaField, StringField, NumberField } = foundry.data.fields;
  return new SchemaField({
    // TODO: no generation behavior (id) or capture behavior
    // (recordedBy/worldTime/realTime) yet — transaction creation is out of
    // scope for this wireframe.
    id: new StringField({ required: true, initial: "" }),
    type: new StringField({ required: true, initial: "income", choices: ["income", "purchase"] }),
    description: new StringField({ required: true, initial: "" }),
    value: new NumberField({ required: true, initial: 0, integer: true }),
    recordedBy: new StringField({ required: true, nullable: true, initial: null }),
    worldTime: new NumberField({ required: true, nullable: true, initial: null }),
    realTime: new NumberField({ required: true, initial: 0 }),
  });
}

// TODO: received/spent/available are placeholders (default 0) until a
// calculation system derives them from the ledger; carried is a separate
// placeholder pending Item pricing/aggregation (see the Finances type
// above) — no calculation exists yet for any of them (wireframe only).
export function financesField(): foundry.data.fields.SchemaField {
  const { SchemaField, NumberField, ArrayField } = foundry.data.fields;
  return new SchemaField({
    received: new NumberField({ required: true, initial: 0, integer: true }),
    spent: new NumberField({ required: true, initial: 0, integer: true }),
    available: new NumberField({ required: true, initial: 0, integer: true }),
    carried: new NumberField({ required: true, initial: 0, integer: true }),
    ledger: new ArrayField(financeLedgerItemField(), { required: true, initial: [] }),
  });
}
