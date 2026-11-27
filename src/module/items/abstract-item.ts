import { type Changes, changesField } from "../change.js";
import { type Actions, actionsField } from "./action.js";
import { type GrantData, grantsField } from "./grants.js";
import { type Identifier } from "../identifier.js";

export type { Identifier };
export type Tag = string;

// The data shape every abstract Item type shares (capabilities/features
// rendered via AbstractItemSheet — Ability, Trait, and later ones; not
// physical inventory objects, and not the eventual "stamp" types, which
// will be treated differently). Effect already has this same shape
// independently and is the next candidate to adopt it, once its own
// sheet moves onto AbstractItemSheet — left alone here since that's a
// separate migration with its own default-value question (its `active`
// currently defaults to false, not true).
//
// The character-composition types (Template, Race, Soldier Type) share
// everything but Actions: an Action a Race provides belongs on a linked
// child Trait or Ability, which carries its own uses, recharge and pin.
export type BaseItemData = {
  active: boolean;
  description: string;
  tags: Tag[];
  identifier: Identifier;
  changes: Changes;
  grants: GrantData[];
};

export type AbstractItemData = BaseItemData & {
  actions: Actions;
};

export function baseItemFields() {
  const { ArrayField, BooleanField, StringField } = foundry.data.fields;
  return {
    active: new BooleanField({ required: true, initial: true }),
    description: new StringField({ required: true, initial: "" }),
    tags: new ArrayField(new StringField({ required: true, blank: false })),
    identifier: new StringField({ required: true, initial: "" }),
    changes: changesField(),
    grants: grantsField(),
  };
}

export function abstractItemFields() {
  return {
    ...baseItemFields(),
    actions: actionsField(),
  };
}
