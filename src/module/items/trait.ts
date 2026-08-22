import { type Changes, changesField } from "../change.js";
import { type Actions, actionsField } from "./action.js";

const { StringField } = foundry.data.fields;

export type TraitData = {
  description: string;
  changes: Changes;
  actions: Actions;
};

export class TraitDataModel extends foundry.abstract.TypeDataModel {
  static override defineSchema() {
    return {
      description: new StringField({ required: true, initial: "" }),
      changes: changesField(),
      actions: actionsField(),
    };
  }
}
