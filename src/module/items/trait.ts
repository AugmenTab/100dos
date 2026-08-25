import { type AbstractItemData, abstractItemFields } from "./abstract-item.js";

export type TraitData = AbstractItemData;

export class TraitDataModel extends foundry.abstract.TypeDataModel {
  static override defineSchema() {
    return abstractItemFields();
  }
}
