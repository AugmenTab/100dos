import { type Contributions, contributionsField } from "./contribution.js";

export type DamageResistanceLocationType = "head" | "torso" | "arm" | "leg" | "wing" | "tail";

// Fixed Dashboard presentation order for the category cells — not a runtime
// property of DamageResistanceLocationType itself (TS unions aren't
// ordered), just the one place that order is declared.
export const DR_LOCATION_TYPES: DamageResistanceLocationType[] = ["head", "torso", "arm", "leg", "wing", "tail"];

export type LocationPlacement = "left" | "right" | "none";

// Presentation order within a category — "left" and "right" pair up
// visually before an unpaired "none" location.
const PLACEMENT_ORDER: LocationPlacement[] = ["left", "right", "none"];

export type DamageResistanceLocation = {
  type: DamageResistanceLocationType;
  label: string;
  placement: LocationPlacement;
  order: number;
  destroyed: boolean;
  value: number;
  contributions: Contributions;
};

// A keyed collection of arbitrary locations (e.g. "leftArm", "frontLeftLeg",
// "head1") rather than a fixed six-location humanoid shape or an array —
// the key is stable identity ("system.dr.frontLeftLeg.value"), not
// positional.
export type DamageResistanceLocations = Record<string, DamageResistanceLocation>;

// Sorts a set of same-category locations for display: `order` ascending,
// then `placement` (left, then right, then none). Never infers pairing or
// ordering from the label — both are explicit fields. Generic so callers
// that pair each location with its schema key (e.g. { key, ...location })
// don't lose that property through the sort.
export function sortLocationsForDisplay<T extends DamageResistanceLocation>(locations: T[]): T[] {
  return [...locations].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return PLACEMENT_ORDER.indexOf(a.placement) - PLACEMENT_ORDER.indexOf(b.placement);
  });
}

function damageResistanceLocationField(): foundry.data.fields.SchemaField {
  const { SchemaField, StringField, NumberField, BooleanField } = foundry.data.fields;
  return new SchemaField({
    type: new StringField({ required: true, initial: "head", choices: DR_LOCATION_TYPES }),
    label: new StringField({ required: true, initial: "" }),
    placement: new StringField({ required: true, initial: "none", choices: PLACEMENT_ORDER }),
    order: new NumberField({ required: true, initial: 0, integer: true }),
    destroyed: new BooleanField({ required: true, initial: false }),
    value: new NumberField({ required: true, initial: 0, integer: true }),
    contributions: contributionsField(),
  });
}

// A keyed collection, not a fixed set of named fields — every actor's
// anatomy is arbitrary, so there's nothing to default to. Empty by design:
// nothing here assumes a humanoid (or any) shape. Populated by the seed
// script for dev/testing, and eventually by chargen/Item grants.
export function damageResistanceField(): foundry.data.fields.TypedObjectField {
  const { TypedObjectField } = foundry.data.fields;
  return new TypedObjectField(damageResistanceLocationField(), { required: true, initial: {} });
}
