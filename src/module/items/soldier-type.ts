import { type AbstractItemData, abstractItemFields } from "./abstract-item.js";
import { type Advances, advancesField } from "../advances.js";
import { type BaseCharacteristics, baseCharacteristicsField } from "../base-characteristics.js";
import { type BaseMythicCharacteristics, baseMythicCharacteristicsField } from "../base-mythic-characteristics.js";
import { type BodyLocations, bodyLocationsField } from "../body-location.js";
import { type Size, sizeField } from "../size.js";

// Either a character's complete foundation (e.g. Mythic) or a supplement to
// an independently selected Race (e.g. Empires and Orders). Each
// foundational property is independently nullable — deliberately not one
// optional "profile" structure — and a null one is backfilled by the
// active Race, if any. Race takes precedence wherever both supply one.
export type SoldierTypeData = AbstractItemData & {
  advances: Advances;
  xpCost: number;
  baseCharacteristics: BaseCharacteristics | null;
  baseMythicCharacteristics: BaseMythicCharacteristics | null;
  baseSize: Size | null;
  bodyLocations: BodyLocations | null;
};

export class SoldierTypeDataModel extends foundry.abstract.TypeDataModel {
  static override defineSchema() {
    const { NumberField } = foundry.data.fields;
    return {
      ...abstractItemFields(),
      advances: advancesField(),
      xpCost: new NumberField({ required: true, initial: 0, integer: true, min: 0 }),
      baseCharacteristics: baseCharacteristicsField(),
      baseMythicCharacteristics: baseMythicCharacteristicsField(),
      baseSize: sizeField({ nullable: true }),
      bodyLocations: bodyLocationsField({ nullable: true }),
    };
  }
}
