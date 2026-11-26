import { CHARACTERISTIC_IDS, type CharacteristicId } from "./characteristic.js";

// A Characteristic Advancement *count* per Characteristic — not a
// Characteristic increase. Each count maps to a named tier (Simple through
// Mastery); the increase it eventually imparts is derived, never stored.
// Distinct from ordinary Characteristic adjustments, which are Changes.
//
// The eventual derivation (not implemented yet) sums every applicable
// source's count for a Characteristic, including the Actor's own
// independently acquired advancements, clamps the total to 0–5, and
// multiplies by five: 5 * clamp(0, 5, sum(advances)). Clamping the total
// never mutates the contributing sources.
export type Advances = Record<CharacteristicId, number>;

export const MIN_ADVANCE = 0;
export const MAX_ADVANCE = 5;

// Localized label for each count, indexed by the count itself.
export const ADVANCE_LEVEL_LABELS: readonly string[] = [
  "DOS100.advances.levels.none",
  "DOS100.advances.levels.simple",
  "DOS100.advances.levels.rookie",
  "DOS100.advances.levels.intermediate",
  "DOS100.advances.levels.proficient",
  "DOS100.advances.levels.mastery",
];

export function isAdvanceCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= MIN_ADVANCE && value <= MAX_ADVANCE;
}

export function emptyAdvances(): Advances {
  return Object.fromEntries(CHARACTERISTIC_IDS.map((id) => [id, 0])) as Advances;
}

// The Characteristic increase a single count represents (+5 per tier). The
// aggregate across sources is a later derivation; this is only the
// per-level meaning shown to authors.
export function advanceIncrease(count: number): number {
  return 5 * count;
}

export type AdvanceRow = { id: CharacteristicId; count: number };

// The editor's rows: only nonzero entries, in Characteristic order. A zero
// entry is equivalent to no entry at all.
export function advanceRows(advances: Advances): AdvanceRow[] {
  return CHARACTERISTIC_IDS.filter((id) => advances[id] !== 0).map((id) => ({ id, count: advances[id] }));
}

// Characteristics without an entry yet, in Characteristic order — what an
// Add control may pick from. Empty once all ten are represented.
export function unusedAdvanceCharacteristics(advances: Advances): CharacteristicId[] {
  return CHARACTERISTIC_IDS.filter((id) => advances[id] === 0);
}

// The Characteristic options for one row's selector: the row's own
// Characteristic plus every one no other row uses, in Characteristic order.
export function advanceRowCharacteristicOptions(advances: Advances, rowId: CharacteristicId): CharacteristicId[] {
  return CHARACTERISTIC_IDS.filter((id) => id === rowId || advances[id] === 0);
}

// The update that moves one row to a different Characteristic, keeping its
// count. Null when the move isn't allowed (same Characteristic, or the
// target already has an entry of its own).
export function moveAdvanceUpdate(
  advances: Advances,
  from: CharacteristicId,
  to: CharacteristicId,
): Partial<Advances> | null {
  if (from === to || advances[to] !== 0) return null;
  return { [from]: 0, [to]: advances[from] };
}

export function advancesField(): foundry.data.fields.SchemaField {
  const { SchemaField, NumberField } = foundry.data.fields;
  return new SchemaField(
    Object.fromEntries(
      CHARACTERISTIC_IDS.map((id) => [
        id,
        new NumberField({ required: true, initial: 0, integer: true, min: MIN_ADVANCE, max: MAX_ADVANCE }),
      ]),
    ),
  );
}
