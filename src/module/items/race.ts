import { type AbstractItemData, abstractItemFields } from "./abstract-item.js";
import { type Advances, advancesField } from "../advances.js";
import { type BaseCharacteristics, baseCharacteristicsField } from "../base-characteristics.js";
import { type BaseMythicCharacteristics, baseMythicCharacteristicsField } from "../base-mythic-characteristics.js";
import { type BodyLocations, bodyLocationsField } from "../body-location.js";
import { type Size, sizeField } from "../size.js";

// Establishes a character's foundational properties. Where both an active
// Race and an active Soldier Type supply the same foundational property,
// the Race's wins (see soldier-type.ts and docs/architecture.md).
//
// Base Characteristics, Base Size, and Body Locations are required for a
// complete Race. Base Characteristics is nevertheless null until first
// authored — the only honest "not yet set" state, since ten zeros would
// read as a complete (and badly injured) profile; once set, the sheet only
// lets it be edited, never cleared. Body Locations likewise starts as an
// empty, incomplete collection.
export type RaceData = AbstractItemData & {
  advances: Advances;
  xpCost: number;
  baseCharacteristics: BaseCharacteristics | null;
  baseMythicCharacteristics: BaseMythicCharacteristics | null;
  baseSize: Size;
  bodyLocations: BodyLocations;
};

export class RaceDataModel extends foundry.abstract.TypeDataModel {
  static override defineSchema() {
    const { NumberField } = foundry.data.fields;
    return {
      ...abstractItemFields(),
      advances: advancesField(),
      xpCost: new NumberField({ required: true, initial: 0, integer: true, min: 0 }),
      baseCharacteristics: baseCharacteristicsField(),
      baseMythicCharacteristics: baseMythicCharacteristicsField(),
      baseSize: sizeField({ nullable: false }),
      bodyLocations: bodyLocationsField({ nullable: false }),
    };
  }
}
