import { type Identifier } from "../identifier.js";
import { SKILL_DIFFICULTIES, type SkillDifficulty } from "../skill.js";
import { CHARACTERISTIC_IDS, type CharacteristicId } from "../characteristic.js";

export type EducationCost = {
  plus5: number;
  plus10: number;
};

export type EducationSkill = {
  identifier: Identifier;
  name: string;
};

export type EducationData = {
  identifier: Identifier;
  difficulty: SkillDifficulty;
  characteristics: CharacteristicId[];
  skills: EducationSkill[];
  description: string;
  cost: EducationCost;
};

export class EducationDataModel extends foundry.abstract.TypeDataModel {
  static override defineSchema() {
    const { ArrayField, HTMLField, NumberField, SchemaField, StringField } = foundry.data.fields;
    return {
      identifier: new StringField({ required: true, initial: "" }),
      difficulty: new StringField({ required: true, initial: SKILL_DIFFICULTIES[0], choices: SKILL_DIFFICULTIES }),
      characteristics: new ArrayField(new StringField({ required: true, choices: CHARACTERISTIC_IDS }), { required: true, initial: [] }),
      skills: new ArrayField(
        new SchemaField({
          identifier: new StringField({ required: true, initial: "" }),
          name: new StringField({ required: true, initial: "" }),
        }),
        { required: true, initial: [] },
      ),
      description: new HTMLField({ required: true, initial: "" }),
      cost: new SchemaField({
        plus5: new NumberField({ required: true, initial: 0, integer: true, min: 0 }),
        plus10: new NumberField({ required: true, initial: 0, integer: true, min: 0 }),
      }),
    };
  }
}
