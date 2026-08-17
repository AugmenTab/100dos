import { characteristicsField } from "../characteristic.js";
import { mythicCharacteristicsField } from "../mythic-characteristic.js";
import { initiativeField } from "../initiative.js";
import { luckField } from "../luck.js";
import { woundsField } from "../wounds.js";
import { fatigueField } from "../fatigue.js";
import { damageResistanceField } from "../damage-resistance.js";
import { actorMovementField } from "../movement.js";
import { xpField } from "../xp.js";
import { biographyField } from "../biography.js";

export class PcDataModel extends foundry.abstract.TypeDataModel {
  static override defineSchema() {
    const { DocumentUUIDField } = foundry.data.fields;
    return {
      // TODO: references an embedded Item, but the Archetype Item type
      // doesn't exist yet — will always be null until it does.
      archetype: new DocumentUUIDField({ type: "Item", embedded: true, nullable: true, initial: null }),
      xp: xpField(),
      biography: biographyField(),
      // TODO: all fields below are unrelated placeholders (defaults 0/[])
      // until a calculation system derives them from real game rules.
      characteristics: characteristicsField(),
      mythicCharacteristics: mythicCharacteristicsField(),
      initiative: initiativeField(),
      luck: luckField(),
      wounds: woundsField(),
      fatigue: fatigueField(),
      dr: damageResistanceField(),
      movement: actorMovementField(),
    };
  }
}
