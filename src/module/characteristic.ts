import { type Contributions, contributionsField } from "./contribution.js";

export type CharacteristicModifier = {
  value: number;
  contributions: Contributions;
};

export type Characteristic = {
  base: number;
  temp: number;
  value: number;
  advancement: number;
  contributions: Contributions;
  mod: CharacteristicModifier;
};

export type CharacteristicId =
  | "str"
  | "tou"
  | "agi"
  | "wfr"
  | "wfm"
  | "int"
  | "per"
  | "crg"
  | "cha"
  | "ldr";

// Ordered runtime companion to CharacteristicId — TS unions carry no
// iteration order of their own, but other schemas (e.g. Skill's `choices`
// constraint) need every valid ID as a real array.
export const CHARACTERISTIC_IDS: CharacteristicId[] = [
  "str",
  "tou",
  "agi",
  "wfr",
  "wfm",
  "int",
  "per",
  "crg",
  "cha",
  "ldr",
];

export type Characteristics = Record<CharacteristicId, Characteristic>;

// The ten Characteristic IDs are reserved: any other system that stores a
// Characteristic-or-something-else target as a bare string (e.g. Education's
// EducationTarget) distinguishes the two cases by membership in this list,
// rather than a tagged/wrapped value.
export function isCharacteristicId(value: string): value is CharacteristicId {
  return (CHARACTERISTIC_IDS as string[]).includes(value);
}

function characteristicField(): foundry.data.fields.SchemaField {
  const { SchemaField, NumberField } = foundry.data.fields;
  return new SchemaField({
    base: new NumberField({ required: true, initial: 0, integer: true }),
    temp: new NumberField({ required: true, initial: 0, integer: true }),
    value: new NumberField({ required: true, initial: 0, integer: true }),
    advancement: new NumberField({ required: true, initial: 0, integer: true }),
    contributions: contributionsField(),
    mod: new SchemaField({
      value: new NumberField({ required: true, initial: 0, integer: true }),
      contributions: contributionsField(),
    }),
  });
}

export function characteristicsField(): foundry.data.fields.SchemaField {
  const { SchemaField } = foundry.data.fields;
  return new SchemaField({
    str: characteristicField(),
    tou: characteristicField(),
    agi: characteristicField(),
    wfr: characteristicField(),
    wfm: characteristicField(),
    int: characteristicField(),
    per: characteristicField(),
    crg: characteristicField(),
    cha: characteristicField(),
    ldr: characteristicField(),
  });
}
