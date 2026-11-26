import { CHARACTERISTIC_IDS, type CharacteristicId } from "../../characteristic.js";
import {
  ADVANCE_LEVEL_LABELS,
  MAX_ADVANCE,
  type Advances,
  advanceRowCharacteristicOptions,
  advanceRows,
  unusedAdvanceCharacteristics,
} from "../../advances.js";
import { type BaseCharacteristics } from "../../base-characteristics.js";
import {
  MYTHIC_CHARACTERISTIC_IDS,
  type BaseMythicCharacteristics,
  type MythicCharacteristicId,
} from "../../base-mythic-characteristics.js";
import { type BodyLocations, type BodyLocationType, type LocationPlacement, orderedBodyLocations } from "../../body-location.js";
import { SIZES, type Size } from "../../size.js";

// Whether an Item supplies foundational properties at all (Template does
// not), and if so whether they are required (Race) or each independently
// optional (Soldier Type).
export type FoundationMode = "none" | "required" | "optional";

// The composition fields every one of Template/Race/Soldier Type reads;
// the foundational ones are absent on a Template.
export type CompositionSystem = {
  advances: Advances;
  xpCost?: number;
  baseCharacteristics?: BaseCharacteristics | null;
  baseMythicCharacteristics?: BaseMythicCharacteristics | null;
  baseSize?: Size | null;
  bodyLocations?: BodyLocations | null;
};

type Option<T> = { value: T; labelKey: string; selected: boolean };

export type AdvanceRowContext = {
  id: CharacteristicId;
  count: number;
  characteristicOptions: Option<CharacteristicId>[];
  levelOptions: Option<number>[];
};

export type FoundationContext = {
  required: boolean;
  xpCost: number;
  // null when not supplied (or, on a Race, not yet set).
  baseCharacteristics: { id: CharacteristicId; value: number }[] | null;
  baseMythicCharacteristics: { id: MythicCharacteristicId; value: number | null }[] | null;
  sizeNullable: boolean;
  sizeOptions: Option<Size>[];
  // null when no anatomy is supplied; [] when supplied but empty. The flag
  // spares templates from Handlebars' #if treating [] as false.
  bodyLocationsSupplied: boolean;
  bodyLocations: { key: string; label: string; type: BodyLocationType; placement: LocationPlacement; order: number }[] | null;
};

export type CompositionContext = {
  advances: { rows: AdvanceRowContext[]; canAdd: boolean };
  foundation: FoundationContext | null;
};

// Render context for the composition Details fields — every label is a
// localization key, localized by the template. Pure, so the browser tier
// renders the same context the sheet does.
export function compositionContext(system: CompositionSystem, mode: FoundationMode): CompositionContext {
  const levels = Array.from({ length: MAX_ADVANCE }, (_, i) => i + 1);
  const rows = advanceRows(system.advances).map(({ id, count }) => ({
    id,
    count,
    characteristicOptions: advanceRowCharacteristicOptions(system.advances, id).map((option) => ({
      value: option,
      labelKey: `DOS100.characteristic.${option}.abbr`,
      selected: option === id,
    })),
    levelOptions: levels.map((level) => ({
      value: level,
      labelKey: ADVANCE_LEVEL_LABELS[level]!,
      selected: level === count,
    })),
  }));
  const advances = { rows, canAdd: unusedAdvanceCharacteristics(system.advances).length > 0 };
  if (mode === "none") return { advances, foundation: null };

  const base = system.baseCharacteristics ?? null;
  const mythic = system.baseMythicCharacteristics ?? null;
  const size = system.baseSize ?? null;
  const locations = system.bodyLocations ?? null;
  return {
    advances,
    foundation: {
      required: mode === "required",
      xpCost: system.xpCost ?? 0,
      baseCharacteristics: base === null ? null : CHARACTERISTIC_IDS.map((id) => ({ id, value: base[id] })),
      baseMythicCharacteristics:
        mythic === null ? null : MYTHIC_CHARACTERISTIC_IDS.map((id) => ({ id, value: mythic[id] })),
      sizeNullable: mode === "optional",
      sizeOptions: SIZES.map((value) => ({ value, labelKey: `DOS100.size.${value}`, selected: value === size })),
      bodyLocationsSupplied: locations !== null,
      bodyLocations:
        locations === null
          ? null
          : orderedBodyLocations(locations).map(({ key, label, type, placement, order }) => ({
              key,
              label,
              type,
              placement,
              order,
            })),
    },
  };
}
