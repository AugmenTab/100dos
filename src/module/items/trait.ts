import { type AbstractItemData, abstractItemFields } from "./abstract-item.js";

export type TraitData = AbstractItemData & {
  showInCombatTab: boolean;
};

export class TraitDataModel extends foundry.abstract.TypeDataModel {
  static override defineSchema() {
    const { BooleanField } = foundry.data.fields;
    return {
      ...abstractItemFields(),
      showInCombatTab: new BooleanField({ required: true, initial: false }),
    };
  }
}
