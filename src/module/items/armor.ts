import { type Actions, actionsField } from "./action.js";
import { type Weight, weightField } from "./weight.js";

const { BooleanField, NumberField, StringField } = foundry.data.fields;

// TODO: incomplete — only "armor" exists so far; more body slots to come.
export type BodySlot = "armor";

export type ArmorData = {
  carried: boolean;
  equipped: boolean;
  quantity: number;
  weight: Weight;
  slot: BodySlot | null;
  actions: Actions;
};

export class ArmorDataModel extends foundry.abstract.TypeDataModel {
  static override defineSchema() {
    return {
      carried: new BooleanField({ required: true, initial: true }),
      equipped: new BooleanField({ required: true, initial: false }),
      quantity: new NumberField({ required: true, initial: 1, integer: true, min: 0 }),
      weight: weightField(),
      slot: new StringField({ required: true, nullable: true, initial: null, choices: ["armor"] }),
      actions: actionsField(),
    };
  }
}
