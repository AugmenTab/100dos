// Unit-test stand-in for foundry.data.fields: each field class only records
// what it was constructed with, so a test can assert on a schema's
// composition (which fields exist, their nullability, initial values,
// bounds) without a Foundry runtime. It implements no validation or
// cleaning of its own — that behavior is Foundry's, and is covered by the
// e2e tier.

export type FieldOptions = Record<string, unknown>;

export class FakeField {
  readonly options: FieldOptions;
  constructor(options: FieldOptions = {}) {
    this.options = options;
  }
}

export class FakeSchemaField extends FakeField {
  readonly fields: Record<string, FakeField>;
  constructor(fields: Record<string, FakeField>, options: FieldOptions = {}) {
    super(options);
    this.fields = fields;
  }
}

export class FakeElementField extends FakeField {
  readonly element: FakeField;
  constructor(element: FakeField, options: FieldOptions = {}) {
    super(options);
    this.element = element;
  }
}

class FakeNumberField extends FakeField {}
class FakeStringField extends FakeField {}
class FakeBooleanField extends FakeField {}
class FakeHTMLField extends FakeField {}
class FakeObjectField extends FakeField {}

export function installFakeFoundryFields(): void {
  (globalThis as unknown as { foundry: unknown }).foundry = {
    data: {
      fields: {
        DataField: FakeField,
        NumberField: FakeNumberField,
        StringField: FakeStringField,
        BooleanField: FakeBooleanField,
        HTMLField: FakeHTMLField,
        ObjectField: FakeObjectField,
        SchemaField: FakeSchemaField,
        ArrayField: FakeElementField,
        TypedObjectField: FakeElementField,
      },
    },
    utils: { randomID: () => "fakeRandomId" },
  };
}

// Narrows a real field-constructor return value back to its fake shape.
export function fake<T extends FakeField>(field: unknown): T {
  return field as T;
}
