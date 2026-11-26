import { type Characteristics } from "../characteristic.js";
import { type MythicCharacteristics } from "../mythic-characteristic.js";
import { type Initiative } from "../initiative.js";
import { type Luck } from "../luck.js";
import { type Wounds } from "../wounds.js";
import { type Fatigue } from "../fatigue.js";
import { type DamageResistanceLocations } from "../damage-resistance.js";
import { type ActorMovement } from "../movement.js";
import { type ExperienceLedger } from "../xp.js";
import { type Finances } from "../finances.js";
import { type Encumbrance } from "../encumbrance.js";
import { type Basic } from "../basic.js";
import { type ActorSkills } from "../skill.js";
import { type ActorEducations, type EducationRecord } from "../education.js";
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

// The prepared shape of a PC's `actor.system`, mirroring defineSchema()
// below field for field — kept beside it so the two change together.
export type PcSystem = {
  xp: ExperienceLedger;
  finances: Finances;
  basic: Basic;
  biography: string;
  notes: string;
  characteristics: Characteristics;
  mythicCharacteristics: MythicCharacteristics | null;
  initiative: Initiative;
  luck: Luck;
  wounds: Wounds;
  fatigue: Fatigue;
  dr: DamageResistanceLocations;
  movement: ActorMovement;
  encumbrance: Encumbrance;
  skills: ActorSkills;
  education: EducationRecord;
  educations: ActorEducations;
  spells: object | null;
};

export class PcDataModel extends foundry.abstract.TypeDataModel {
  static override defineSchema() {
    const { HTMLField, ObjectField } = foundry.data.fields;
    return {
      // No selected Race/Soldier Type reference lives here: each owned
      // Item's own system.active is the selection (see
      // exclusive-activation.ts).
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
