import { type CharacteristicId } from "./characteristic.js";
import { type Contributions, contributionsField } from "./contribution.js";
import { SKILL_DIFFICULTIES, type SkillDifficulty, type SkillIdentifier } from "./skill.js";

export type EducationTraining = "plus5" | "plus10";
export const EDUCATION_TRAININGS: EducationTraining[] = ["plus5", "plus10"];

// A bare string, distinguished at read time by isCharacteristicId (see
// characteristic.ts) rather than a tagged/wrapped value — the ten
// Characteristic IDs are reserved and unavailable as Skill identifiers so
// this stays unambiguous.
export type EducationTarget = SkillIdentifier | CharacteristicId;

export type EducationIdentifier = string;

// The record key under system.educations is the Education's stable
// identity — not duplicated here, matching ActorSkill (see skill.ts).
export type ActorEducation = {
  name: string;
  difficulty: SkillDifficulty;
  training: EducationTraining;
  // The Actor's currently selected Characteristic/Skill target for this
  // Education, and the ordered set of targets valid to select — two
  // different fields for two different jobs, same split as ActorSkill's
  // characteristic/characteristics. TODO: nothing here enforces `selected`
  // is a member of `options`; that's left to whatever populates an
  // Education, not this wireframe.
  selected: EducationTarget;
  options: EducationTarget[];
  value: number;
  pinned: boolean;
  description: string;
  contributions: Contributions;
};

export type ActorEducations = Record<EducationIdentifier, ActorEducation>;

// The Actor's overall Education resource — a single aggregate, not keyed
// like ActorEducations. TODO: the relationship between value/max and
// purchased Educations isn't calculated yet.
export type EducationRecord = {
  value: number;
  max: number;
  contributions: Contributions;
};

export function educationField(): foundry.data.fields.SchemaField {
  const { SchemaField, NumberField } = foundry.data.fields;
  return new SchemaField({
    value: new NumberField({ required: true, initial: 0, integer: true }),
    max: new NumberField({ required: true, initial: 0, integer: true }),
    contributions: contributionsField(),
  });
}

function actorEducationField(): foundry.data.fields.SchemaField {
  const { SchemaField, StringField, NumberField, BooleanField, HTMLField, ArrayField } = foundry.data.fields;
  return new SchemaField({
    name: new StringField({ required: true, initial: "" }),
    difficulty: new StringField({ required: true, initial: SKILL_DIFFICULTIES[0], choices: SKILL_DIFFICULTIES }),
    training: new StringField({ required: true, initial: EDUCATION_TRAININGS[0], choices: EDUCATION_TRAININGS }),
    // No `choices` constraint: a valid target is any of the ten
    // Characteristic IDs or an arbitrary Skill identifier, not a statically
    // enumerable list — unlike ActorSkill's `characteristic`, there's no
    // fixed array to draw a leftmost-literal default from, so this is a
    // plain blank string like `name`/`description`.
    selected: new StringField({ required: true, initial: "" }),
    options: new ArrayField(new StringField({ required: true }), { required: true, initial: [] }),
    value: new NumberField({ required: true, initial: 0, integer: true }),
    pinned: new BooleanField({ required: true, initial: false }),
    description: new HTMLField({ required: true, initial: "" }),
    contributions: contributionsField(),
  });
}

// A keyed collection of arbitrary Education identifiers — empty by design. Unlike
// Skills, an Education exists in this record only once purchased; there is
// no "untrained" entry.
export function educationsField(): foundry.data.fields.TypedObjectField {
  const { TypedObjectField } = foundry.data.fields;
  return new TypedObjectField(actorEducationField(), { required: true, initial: {} });
}
