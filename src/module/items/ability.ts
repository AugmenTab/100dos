import { type AbstractItemData, abstractItemFields } from "./abstract-item.js";

const { NumberField, StringField } = foundry.data.fields;

export type AbilityData = AbstractItemData & {
  xpCost: number;
  prerequisites: string;
  summary: string;
};

export class AbilityDataModel extends foundry.abstract.TypeDataModel {
  static override defineSchema() {
    return {
      ...abstractItemFields(),
      xpCost: new NumberField({ required: true, initial: 0, integer: true, min: 0 }),
      prerequisites: new StringField({ required: true, initial: "" }),
      summary: new StringField({ required: true, initial: "" }),
    };
  }
}
