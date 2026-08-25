import { type Changes, changesField } from "../change.js";
import { type Actions, actionsField } from "./action.js";

export type Tag = string;
export type Identifier = string;

// The data shape every abstract Item type shares (capabilities/features
// rendered via AbstractItemSheet — Ability, Trait, and later ones; not
// physical inventory objects, and not the eventual "stamp" types, which
// will be treated differently). Effect already has this same shape
// independently and is the next candidate to adopt it, once its own
// sheet moves onto AbstractItemSheet — left alone here since that's a
// separate migration with its own default-value question (its `active`
// currently defaults to false, not true).
export type AbstractItemData = {
  active: boolean;
  showInCombatTab: boolean;
  description: string;
  tags: Tag[];
  identifier: Identifier;
  changes: Changes;
  actions: Actions;
};

export function abstractItemFields() {
  const { ArrayField, BooleanField, StringField } = foundry.data.fields;
  return {
    active: new BooleanField({ required: true, initial: true }),
    showInCombatTab: new BooleanField({ required: true, initial: false }),
    description: new StringField({ required: true, initial: "" }),
    tags: new ArrayField(new StringField({ required: true, blank: false })),
    identifier: new StringField({ required: true, initial: "" }),
    changes: changesField(),
    actions: actionsField(),
  };
}
