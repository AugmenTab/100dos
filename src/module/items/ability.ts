import { type Changes, changesField } from "../change.js";
import { type Actions, actionsField } from "./action.js";

const { ArrayField, BooleanField, NumberField, StringField } = foundry.data.fields;

export type Tag = string;
export type Identifier = string;

export type AbilityData = {
  active: boolean;
  showInCombatTab: boolean;
  xpCost: number;
  prerequisites: string;
  summary: string;
  description: string;
  tags: Tag[];
  identifier: Identifier;
  changes: Changes;
  actions: Actions;
};

export class AbilityDataModel extends foundry.abstract.TypeDataModel {
  static override defineSchema() {
    return {
      active: new BooleanField({ required: true, initial: true }),
      showInCombatTab: new BooleanField({ required: true, initial: false }),
      xpCost: new NumberField({ required: true, initial: 0, integer: true, min: 0 }),
      prerequisites: new StringField({ required: true, initial: "" }),
      summary: new StringField({ required: true, initial: "" }),
      description: new StringField({ required: true, initial: "" }),
      tags: new ArrayField(new StringField({ required: true, blank: false })),
      identifier: new StringField({ required: true, initial: "" }),
      changes: changesField(),
      actions: actionsField(),
    };
  }
}
