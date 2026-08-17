import { type Changes, changesField } from "../change.js";
import { type Actions, actionsField } from "./action.js";

const { BooleanField, NumberField, StringField } = foundry.data.fields;

export type AbilityData = {
  xpCost: number;
  prerequisites: string;
  summary: string;
  description: string;
  changes: Changes;
  actions: Actions;
  pinned: boolean;
};

export class AbilityDataModel extends foundry.abstract.TypeDataModel {
  static override defineSchema() {
    return {
      xpCost: new NumberField({ required: true, initial: 0, integer: true, min: 0 }),
      prerequisites: new StringField({ required: true, initial: "" }),
      summary: new StringField({ required: true, initial: "" }),
      description: new StringField({ required: true, initial: "" }),
      changes: changesField(),
      actions: actionsField(),
      // TODO: other Action-bearing Item types (e.g. Weapons) should adopt
      // the same field once they exist.
      pinned: new BooleanField({ required: true, initial: false }),
    };
  }
}
