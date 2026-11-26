import { type Result, err } from "./result.js";

export type MythicCharacteristicId = "str" | "tou" | "agi";

export const MYTHIC_CHARACTERISTIC_IDS: MythicCharacteristicId[] = ["str", "tou", "agi"];

// Foundational Mythic Characteristic values. Each is independently
// nullable, and absence is distinct from zero:
//   null — the character does not possess that Mythic Characteristic;
//   0    — the character possesses it, at zero;
//   n>0  — the character possesses it, at n.
// Never normalize one into the other. Later modifications to Mythic
// Characteristics are Changes, not edits to this structure.
export type BaseMythicCharacteristics = Record<MythicCharacteristicId, number | null>;

// One row of the editor's form: whether the Mythic Characteristic is
// present at all, and (only when present) its raw input.
export type MythicCharacteristicInput = { present: boolean; value: string };

// Parses the editor's form. An absent row stores null regardless of its
// input; a present row needs a whole number of zero or more (a blank
// present row is an error, not zero). Errors name each offending ID.
export function parseBaseMythicCharacteristics(
  raw: Partial<Record<MythicCharacteristicId, MythicCharacteristicInput>>,
): Result<BaseMythicCharacteristics, MythicCharacteristicId[]> {
  const invalid: MythicCharacteristicId[] = [];
  const values: Partial<BaseMythicCharacteristics> = {};
  for (const id of MYTHIC_CHARACTERISTIC_IDS) {
    const row = raw[id];
    if (!row?.present) {
      values[id] = null;
      continue;
    }
    const text = row.value.trim();
    const value = Number(text);
    if (text === "" || !Number.isInteger(value) || value < 0) invalid.push(id);
    else values[id] = value;
  }
  if (invalid.length > 0) return err(invalid);
  return { ok: true, value: values as BaseMythicCharacteristics, warnings: [] };
}

// Nullable as a whole (no Mythic profile supplied at all) and per value.
export function baseMythicCharacteristicsField(): foundry.data.fields.SchemaField {
  const { SchemaField, NumberField } = foundry.data.fields;
  return new SchemaField(
    Object.fromEntries(
      MYTHIC_CHARACTERISTIC_IDS.map((id) => [
        id,
        new NumberField({ required: true, nullable: true, initial: null, integer: true, min: 0 }),
      ]),
    ),
    { required: true, nullable: true, initial: null },
  );
}
