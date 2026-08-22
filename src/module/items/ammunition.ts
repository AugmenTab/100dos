import { type Weight, weightField } from "./weight.js";

const { BooleanField, NumberField } = foundry.data.fields;

export type AmmunitionData = {
  carried: boolean;
  equipped: boolean;
  quantity: number;
  weight: Weight;
};

export class AmmunitionDataModel extends foundry.abstract.TypeDataModel {
  static override defineSchema() {
    return {
      carried: new BooleanField({ required: true, initial: true }),
      equipped: new BooleanField({ required: true, initial: false }),
      quantity: new NumberField({ required: true, initial: 1, integer: true, min: 0 }),
      weight: weightField(),
    };
  }
}
