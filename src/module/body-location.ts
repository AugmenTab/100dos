// Anatomy, independent of any Actor-specific state. A BodyLocation says what
// a location *is* (its category, label, side, and order); Damage Resistance
// (damage-resistance.ts) composes it with the per-Actor values that only
// make sense once a body is in play. Race and Soldier Type Items carry
// BodyLocations on their own, as an anatomical definition.

export type BodyLocationType = "head" | "torso" | "arm" | "leg" | "wing" | "tail";

// Fixed presentation order for the categories — not a runtime property of
// BodyLocationType itself (TS unions aren't ordered), just the one place
// that order is declared.
export const BODY_LOCATION_TYPES: BodyLocationType[] = ["head", "torso", "arm", "leg", "wing", "tail"];

export type LocationPlacement = "left" | "right" | "none";

// Presentation order within a category — "left" and "right" pair up
// visually before an unpaired "none" location.
export const LOCATION_PLACEMENTS: LocationPlacement[] = ["left", "right", "none"];

export type BodyLocation = {
  type: BodyLocationType;
  label: string;
  placement: LocationPlacement;
  order: number;
};

// A keyed collection of arbitrary locations (e.g. "leftArm", "frontLeftLeg",
// "head1") rather than a fixed six-location humanoid shape or an array —
// the key is the location's stable identity, not its position.
export type BodyLocations = Record<string, BodyLocation>;

// Sorts a set of same-category locations for display: `order` ascending,
// then `placement` (left, then right, then none). Never infers pairing or
// ordering from the label — both are explicit fields. Generic so callers
// that pair each location with its key, or carry extra per-Actor state
// (e.g. a DamageResistanceLocation), don't lose those properties through
// the sort.
export function sortLocationsForDisplay<T extends BodyLocation>(locations: T[]): T[] {
  return [...locations].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return LOCATION_PLACEMENTS.indexOf(a.placement) - LOCATION_PLACEMENTS.indexOf(b.placement);
  });
}

// Every location of a collection, paired with its key, in full display
// order: category (BODY_LOCATION_TYPES), then sortLocationsForDisplay within
// each category.
export function orderedBodyLocations<T extends BodyLocation>(locations: Record<string, T>): (T & { key: string })[] {
  const entries = Object.entries(locations).map(([key, location]) => ({ ...location, key }));
  return BODY_LOCATION_TYPES.flatMap((type) => sortLocationsForDisplay(entries.filter((location) => location.type === type)));
}

// The anatomical fields alone, spread into any schema that composes a
// BodyLocation (see damage-resistance.ts).
export function bodyLocationFields(): Record<string, foundry.data.fields.DataField> {
  const { StringField, NumberField } = foundry.data.fields;
  return {
    type: new StringField({ required: true, initial: "head", choices: BODY_LOCATION_TYPES }),
    label: new StringField({ required: true, initial: "" }),
    placement: new StringField({ required: true, initial: "none", choices: LOCATION_PLACEMENTS }),
    order: new NumberField({ required: true, initial: 0, integer: true }),
  };
}

// A keyed BodyLocations collection. Required collections start empty — an
// empty collection is not a valid anatomy for gameplay, but it is the
// honest "not yet authored" state. Nullable collections start null, meaning
// no anatomy is supplied at all.
export function bodyLocationsField(options: { nullable: boolean }): foundry.data.fields.TypedObjectField {
  const { SchemaField, TypedObjectField } = foundry.data.fields;
  return new TypedObjectField(new SchemaField(bodyLocationFields()), {
    required: true,
    nullable: options.nullable,
    initial: options.nullable ? null : {},
  });
}
