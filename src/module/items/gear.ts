import { type Actions, actionsField } from "./action.js";
import { type Weight, weightField } from "./weight.js";

const { BooleanField, NumberField } = foundry.data.fields;

export type GearData = {
  carried: boolean;
  equipped: boolean;
  quantity: number;
  weight: Weight;
  actions: Actions;
};

export class GearDataModel extends foundry.abstract.TypeDataModel {
  static override defineSchema() {
    return {
      carried: new BooleanField({ required: true, initial: true }),
      equipped: new BooleanField({ required: true, initial: false }),
      quantity: new NumberField({ required: true, initial: 1, integer: true, min: 0 }),
      weight: weightField(),
      actions: actionsField(),
    };
  }
}
