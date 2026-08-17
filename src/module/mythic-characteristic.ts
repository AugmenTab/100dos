import { type Contributions, contributionsField } from "./contribution.js";

export type MythicCharacteristic = {
  value: number;
  contributions: Contributions;
};

export type MythicCharacteristics = {
  str: MythicCharacteristic;
  tou: MythicCharacteristic;
  agi: MythicCharacteristic;
};

function mythicCharacteristicField(): foundry.data.fields.SchemaField {
  const { SchemaField, NumberField } = foundry.data.fields;
  return new SchemaField({
    value: new NumberField({ required: true, initial: 0, integer: true }),
    contributions: contributionsField(),
  });
}

export function mythicCharacteristicsField(): foundry.data.fields.SchemaField {
  const { SchemaField } = foundry.data.fields;
  return new SchemaField(
    {
      str: mythicCharacteristicField(),
      tou: mythicCharacteristicField(),
      agi: mythicCharacteristicField(),
    },
    { required: false, nullable: true, initial: null },
  );
}
