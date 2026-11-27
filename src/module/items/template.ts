import { type BaseItemData, baseItemFields } from "./abstract-item.js";
import { type Advances, advancesField } from "../advances.js";

// Additional modifications and benefits layered onto an Actor, without
// establishing any foundational property. Characteristic adjustments and
// other statistical modifications are Changes, granted Traits are child
// links, and activation is the shared `active` field — so Advances is the
// only field of its own. Any number may be owned and active at once.
// Actions come from linked child Items, not the Template itself.
export type TemplateData = BaseItemData & {
  advances: Advances;
};

export class TemplateDataModel extends foundry.abstract.TypeDataModel {
  static override defineSchema() {
    return {
      ...baseItemFields(),
      advances: advancesField(),
    };
  }
}
