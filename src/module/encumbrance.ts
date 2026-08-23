import { type Contributions, contributionsField } from "./contribution.js";
import { type MovementMode } from "./movement.js";

export type EncumbranceThreshold = {
  value: number;
  contributions: Contributions;
};

export type BaseThresholds = {
  carry: EncumbranceThreshold;
  encumbered: EncumbranceThreshold;
  heavy: EncumbranceThreshold;
  lift: EncumbranceThreshold;
  push: EncumbranceThreshold;
};

export type SwimThresholds = {
  carry: EncumbranceThreshold;
  encumbered: EncumbranceThreshold;
  heavy: EncumbranceThreshold;
  maximum: EncumbranceThreshold;
};

export type FlyThresholds = {
  carry: EncumbranceThreshold;
  encumbered: EncumbranceThreshold;
};

// fly stays null for an Actor without a Flight movement mode, matching
// ActorMovement.fly's existing nullable pattern in movement.ts.
export type Thresholds = {
  base: BaseThresholds;
  swim: SwimThresholds;
  fly: FlyThresholds | null;
};

// TODO: carried/felt/total and every threshold value below default to 0 —
// no calculation engine derives them from Items/Effects/rules yet. This is
// a wireframe/schema pass only.
export type Encumbrance = {
  carried: number;
  felt: number;
  total: number;
  thresholds: Thresholds;
};

function encumbranceThresholdField(): foundry.data.fields.SchemaField {
  const { SchemaField, NumberField } = foundry.data.fields;
  return new SchemaField({
    value: new NumberField({ required: true, initial: 0 }),
    contributions: contributionsField(),
  });
}

function baseThresholdsField(): foundry.data.fields.SchemaField {
  const { SchemaField } = foundry.data.fields;
  return new SchemaField({
    carry: encumbranceThresholdField(),
    encumbered: encumbranceThresholdField(),
    heavy: encumbranceThresholdField(),
    lift: encumbranceThresholdField(),
    push: encumbranceThresholdField(),
  });
}

function swimThresholdsField(): foundry.data.fields.SchemaField {
  const { SchemaField } = foundry.data.fields;
  return new SchemaField({
    carry: encumbranceThresholdField(),
    encumbered: encumbranceThresholdField(),
    heavy: encumbranceThresholdField(),
    maximum: encumbranceThresholdField(),
  });
}

function flyThresholdsFields(): Record<string, foundry.data.fields.DataField> {
  return {
    carry: encumbranceThresholdField(),
    encumbered: encumbranceThresholdField(),
  };
}

function nullableFlyThresholdsField(): foundry.data.fields.SchemaField {
  const { SchemaField } = foundry.data.fields;
  return new SchemaField(flyThresholdsFields(), { required: false, nullable: true, initial: null });
}

export function encumbranceField(): foundry.data.fields.SchemaField {
  const { SchemaField, NumberField } = foundry.data.fields;
  return new SchemaField({
    carried: new NumberField({ required: true, initial: 0, min: 0 }),
    felt: new NumberField({ required: true, initial: 0, min: 0 }),
    total: new NumberField({ required: true, initial: 0, min: 0 }),
    thresholds: new SchemaField({
      base: baseThresholdsField(),
      swim: swimThresholdsField(),
      fly: nullableFlyThresholdsField(),
    }),
  });
}

// Band labels describe the band itself, never the consequence of exceeding
// it (there is deliberately no "immobile"/"maximum load exceeded" key —
// see .local/plan.md's "Threshold Semantics" section). "encumbered" is
// shared between the swim and fly tracks; the other keys are track-specific.
export type EncumbranceBandKey =
  | "normal"
  | "overEncumbered"
  | "heavilyEncumbered"
  | "encumbered"
  | "heavy"
  | "maximumLoad";

export type EncumbranceBand = {
  labelKey: EncumbranceBandKey;
  thresholdValue: number;
  fillPercent: number;
};

// Sequential range bar: only the load falling within [min, max) fills this
// bar, not the load's total relative to a cumulative threshold. Guards
// max <= min (every threshold defaults to 0 in this wireframe) to an empty
// bar rather than dividing by zero.
function band(min: number, max: number, felt: number, labelKey: EncumbranceBandKey): EncumbranceBand {
  const range = max - min;
  const fillPercent = range > 0 ? Math.min(Math.max((felt - min) / range, 0), 1) * 100 : 0;
  return { labelKey, thresholdValue: max, fillPercent };
}

// Render data only — never persisted to Actor data (see .local/plan.md's
// "Bar Fill Calculation" and "Prepared bar percentages are render data"
// requirements). Track selection mirrors the existing
// land/climb/burrow -> base, swim -> swim, fly -> fly mapping already
// driving the Dashboard's Movement table (system.movement.mode).
export function encumbranceBands(encumbrance: Encumbrance, mode: MovementMode): EncumbranceBand[] {
  const { felt, thresholds } = encumbrance;

  if (mode === "swim") {
    const { carry, encumbered, heavy, maximum } = thresholds.swim;
    return [
      band(0, carry.value, felt, "normal"),
      band(carry.value, encumbered.value, felt, "encumbered"),
      band(encumbered.value, heavy.value, felt, "heavy"),
      band(heavy.value, maximum.value, felt, "maximumLoad"),
    ];
  }

  if (mode === "fly") {
    if (thresholds.fly === null) return [];
    const { carry, encumbered } = thresholds.fly;
    return [band(0, carry.value, felt, "normal"), band(carry.value, encumbered.value, felt, "encumbered")];
  }

  const { carry, encumbered, heavy } = thresholds.base;
  return [
    band(0, carry.value, felt, "normal"),
    band(carry.value, encumbered.value, felt, "overEncumbered"),
    band(encumbered.value, heavy.value, felt, "heavilyEncumbered"),
  ];
}
