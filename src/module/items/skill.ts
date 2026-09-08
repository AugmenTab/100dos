import { type Identifier } from "../identifier.js";
import { SKILL_DIFFICULTIES, SKILL_TYPES, type SkillCost, type SkillDifficulty, type SkillType } from "../skill.js";
import { CHARACTERISTIC_IDS, type CharacteristicId } from "../characteristic.js";

export type { SkillCost };

export type SkillData = {
  identifier: Identifier;
  difficulty: SkillDifficulty;
  kinds: SkillType[];
  characteristics: CharacteristicId[];
  description: string;
  cost: SkillCost;
};

export class SkillDataModel extends foundry.abstract.TypeDataModel {
  static override defineSchema() {
    const { ArrayField, HTMLField, NumberField, SchemaField, StringField } = foundry.data.fields;
    return {
      identifier: new StringField({ required: true, initial: "" }),
      difficulty: new StringField({ required: true, initial: SKILL_DIFFICULTIES[0], choices: SKILL_DIFFICULTIES }),
      kinds: new ArrayField(new StringField({ required: true, choices: SKILL_TYPES }), { required: true, initial: [] }),
      characteristics: new ArrayField(new StringField({ required: true, choices: CHARACTERISTIC_IDS }), { required: true, initial: [] }),
      description: new HTMLField({ required: true, initial: "" }),
      cost: new SchemaField({
        trained: new NumberField({ required: true, initial: 0, integer: true, min: 0 }),
        plus10: new NumberField({ required: true, initial: 0, integer: true, min: 0 }),
        plus20: new NumberField({ required: true, initial: 0, integer: true, min: 0 }),
      }),
    };
  }
}
