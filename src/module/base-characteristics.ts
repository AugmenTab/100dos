import { CHARACTERISTIC_IDS, type CharacteristicId } from "./characteristic.js";
import { type Result, err } from "./result.js";

// A complete foundational Characteristic lineup. Every Characteristic is
// explicit: a zero is a real (and mechanically significant — usually an
// injured or compromised character) value, never a stand-in for "not
// specified". Absence of a lineup is represented by the whole structure
// being null where a schema allows it, never by zeros.
export type BaseCharacteristics = Record<CharacteristicId, number>;

// Parses the ten raw form inputs of the Base Characteristics editor. Every
// Characteristic must be explicitly entered as a whole number of zero or
// more; a blank input is missing, not zero. Errors name each offending
// Characteristic ID, in Characteristic order.
export function parseBaseCharacteristics(
  raw: Partial<Record<CharacteristicId, string>>,
): Result<BaseCharacteristics, CharacteristicId[]> {
  const invalid: CharacteristicId[] = [];
  const values: Partial<BaseCharacteristics> = {};
  for (const id of CHARACTERISTIC_IDS) {
    const text = raw[id]?.trim() ?? "";
    const value = Number(text);
    if (text === "" || !Number.isInteger(value) || value < 0) invalid.push(id);
    else values[id] = value;
  }
  if (invalid.length > 0) return err(invalid);
  return { ok: true, value: values as BaseCharacteristics, warnings: [] };
}

// Required schemas start null too, until first authored: ten zeros would
// read as a complete (and badly injured) profile. A required lineup can
// only be edited once set, never cleared back to null — that is enforced
// by the sheet, not the schema, which only distinguishes "set" from "not
// yet set".
export function baseCharacteristicsField(): foundry.data.fields.SchemaField {
  const { SchemaField, NumberField } = foundry.data.fields;
  return new SchemaField(
    Object.fromEntries(
      CHARACTERISTIC_IDS.map((id) => [id, new NumberField({ required: true, nullable: false, integer: true, min: 0 })]),
    ),
    { required: true, nullable: true, initial: null },
  );
}
