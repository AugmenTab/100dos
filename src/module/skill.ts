import { CHARACTERISTIC_IDS, type CharacteristicId } from "./characteristic.js";
import { type Contributions, contributionsField } from "./contribution.js";

export type SkillDifficulty = "basic" | "advanced";
export const SKILL_DIFFICULTIES: SkillDifficulty[] = ["basic", "advanced"];

export type SkillType = "social" | "movement" | "fieldcraft";
const SKILL_TYPES: SkillType[] = ["social", "movement", "fieldcraft"];

export type SkillTraining = "none" | "trained" | "plus10" | "plus20";
export const SKILL_TRAININGS: SkillTraining[] = ["none", "trained", "plus10", "plus20"];

export type SkillTag = string;

// The record key under system.skills is the Skill's stable identity — not
// duplicated here. A later name change must not imply re-keying the
// record.
export type ActorSkill = {
  name: string;
  difficulty: SkillDifficulty;
  type: SkillType[];
  training: SkillTraining;
  // The Actor's currently selected Characteristic for this Skill, and the
  // ordered set of Characteristics valid to select — two different fields
  // for two different jobs. TODO: nothing here enforces `characteristic`
  // is a member of `characteristics`; that's left to whatever populates a
  // Skill (chargen/Item grant), not this wireframe.
  characteristic: CharacteristicId;
  characteristics: CharacteristicId[];
  value: number;
  pinned: boolean;
  description: string;
  contributions: Contributions;
};

export type ActorSkills = Record<SkillTag, ActorSkill>;

function actorSkillField(): foundry.data.fields.SchemaField {
  const { SchemaField, StringField, NumberField, BooleanField, HTMLField, ArrayField } = foundry.data.fields;
  return new SchemaField({
    name: new StringField({ required: true, initial: "" }),
    difficulty: new StringField({ required: true, initial: SKILL_DIFFICULTIES[0], choices: SKILL_DIFFICULTIES }),
    // A Skill may belong to more than one Type (e.g. both Social and
    // Fieldcraft) — a set, not a single category. Defaults empty, same as
    // `characteristics` below: nothing here assumes a Skill has been fully
    // populated yet.
    type: new ArrayField(new StringField({ required: true, choices: SKILL_TYPES }), { required: true, initial: [] }),
    training: new StringField({ required: true, initial: SKILL_TRAININGS[0], choices: SKILL_TRAININGS }),
    // No universal default Characteristic is meaningful — this
    // leftmost-literal initial exists only to satisfy the field system,
    // matching every other enum field in this schema, and is never
    // exercised while system.skills starts empty.
    characteristic: new StringField({ required: true, initial: CHARACTERISTIC_IDS[0], choices: CHARACTERISTIC_IDS }),
    characteristics: new ArrayField(new StringField({ required: true, choices: CHARACTERISTIC_IDS }), {
      required: true,
      initial: [],
    }),
    value: new NumberField({ required: true, initial: 0, integer: true }),
    pinned: new BooleanField({ required: true, initial: false }),
    description: new HTMLField({ required: true, initial: "" }),
    contributions: contributionsField(),
  });
}

// A keyed collection of arbitrary Skill tags, not a fixed set of named
// fields — every Actor's Skill list is arbitrary, so there's nothing to
// default to. TODO: empty by design; core Skill seeding is a future task.
export function skillsField(): foundry.data.fields.TypedObjectField {
  const { TypedObjectField } = foundry.data.fields;
  return new TypedObjectField(actorSkillField(), { required: true, initial: {} });
}
