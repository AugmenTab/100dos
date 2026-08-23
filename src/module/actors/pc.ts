import { characteristicsField } from "../characteristic.js";
import { mythicCharacteristicsField } from "../mythic-characteristic.js";
import { initiativeField } from "../initiative.js";
import { luckField } from "../luck.js";
import { woundsField } from "../wounds.js";
import { fatigueField } from "../fatigue.js";
import { damageResistanceField } from "../damage-resistance.js";
import { actorMovementField } from "../movement.js";
import { experienceLedgerField } from "../xp.js";
import { financesField } from "../finances.js";
import { encumbranceField } from "../encumbrance.js";
import { basicField } from "../basic.js";
import { skillsField } from "../skill.js";
import { educationField, educationsField } from "../education.js";

export class PcDataModel extends foundry.abstract.TypeDataModel {
  static override defineSchema() {
    const { DocumentUUIDField, HTMLField, ObjectField } = foundry.data.fields;
    return {
      // TODO: references an embedded Item, but the Archetype Item type
      // doesn't exist yet — will always be null until it does.
      archetype: new DocumentUUIDField({ type: "Item", embedded: true, nullable: true, initial: null }),
      xp: experienceLedgerField(),
      finances: financesField(),
      basic: basicField(),
      biography: new HTMLField({ required: true, initial: "" }),
      notes: new HTMLField({ required: true, initial: "" }),
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
      encumbrance: encumbranceField(),
      skills: skillsField(),
      education: educationField(),
      educations: educationsField(),
      // TODO: no spellcasting subsystem is defined yet — this stays null
      // for the entire MVP (not in scope), and only exists so the Spells
      // tab has a real field to check for its own conditional visibility.
      spells: new ObjectField({ required: true, nullable: true, initial: null }),
    };
  }
}
