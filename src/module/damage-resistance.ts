import { type Contributions, contributionsField } from "./contribution.js";
import { type BodyLocation, bodyLocationFields } from "./body-location.js";

// A body location as it exists on an Actor: the anatomy (BodyLocation) plus
// the Actor-specific Damage Resistance state layered on it.
export type DamageResistanceLocation = BodyLocation & {
  destroyed: boolean;
  value: number;
  contributions: Contributions;
};

// Keyed by the location's stable identifier, exactly like BodyLocations
// ("system.dr.frontLeftLeg.value").
export type DamageResistanceLocations = Record<string, DamageResistanceLocation>;

function damageResistanceLocationField(): foundry.data.fields.SchemaField {
  const { SchemaField, NumberField, BooleanField } = foundry.data.fields;
  return new SchemaField({
    ...bodyLocationFields(),
    destroyed: new BooleanField({ required: true, initial: false }),
    value: new NumberField({ required: true, initial: 0, integer: true }),
    contributions: contributionsField(),
  });
}

// A keyed collection, not a fixed set of named fields — every actor's
// anatomy is arbitrary, so there's nothing to default to. Empty by design:
// nothing here assumes a humanoid (or any) shape. Populated by the seed
// script for dev/testing, and eventually by Race/Soldier Type derivation.
export function damageResistanceField(): foundry.data.fields.TypedObjectField {
  const { TypedObjectField } = foundry.data.fields;
  return new TypedObjectField(damageResistanceLocationField(), { required: true, initial: {} });
}
