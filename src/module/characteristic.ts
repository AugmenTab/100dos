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

export type Characteristics = Record<CharacteristicId, Characteristic>;

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
