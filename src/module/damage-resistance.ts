import { type Contributions, contributionsField } from "./contribution.js";

export type DamageResistanceLocation = {
  value: number;
  contributions: Contributions;
};

export type DamageResistanceLocationId = "head" | "leftArm" | "rightArm" | "torso" | "leftLeg" | "rightLeg";

export type DamageResistance = Record<DamageResistanceLocationId, DamageResistanceLocation>;

// TODO: fixed six-location humanoid shape. Non-humanoid/dynamic anatomy
// (missing or extra limbs, tails, wings, etc.) is a deferred, separate
// redesign — not a generic location array here.

function damageResistanceLocationField(): foundry.data.fields.SchemaField {
  const { SchemaField, NumberField } = foundry.data.fields;
  return new SchemaField({
    value: new NumberField({ required: true, initial: 0, integer: true }),
    contributions: contributionsField(),
  });
}

export function damageResistanceField(): foundry.data.fields.SchemaField {
  const { SchemaField } = foundry.data.fields;
  return new SchemaField({
    head: damageResistanceLocationField(),
    leftArm: damageResistanceLocationField(),
    rightArm: damageResistanceLocationField(),
    torso: damageResistanceLocationField(),
    leftLeg: damageResistanceLocationField(),
    rightLeg: damageResistanceLocationField(),
  });
}
