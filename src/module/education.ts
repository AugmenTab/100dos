import { CHARACTERISTIC_IDS, type CharacteristicId } from "./characteristic.js";
import { type Contributions, contributionsField } from "./contribution.js";
import { SKILL_DIFFICULTIES, type SkillDifficulty, type SkillIdentifier } from "./skill.js";
import { type EducationCost, type EducationSkill } from "./items/education.js";

export type EducationTraining = "plus5" | "plus10";
export const EDUCATION_TRAININGS: EducationTraining[] = ["plus5", "plus10"];

// A bare string, distinguished at read time by isCharacteristicId (see
// characteristic.ts) rather than a tagged/wrapped value — the ten
// Characteristic IDs are reserved and unavailable as Skill identifiers so
// this stays unambiguous.
export type EducationTarget = SkillIdentifier | CharacteristicId;

export type EducationIdentifier = string;

// The definition fields supplied when creating an Actor Education manually
// or copied from a Stamp — identifier is the key in system.educations,
// separated from the definition body so the creation helper can validate
// and insert in one place.
export type EducationDefinition = {
  name: string;
  identifier: string;
  difficulty: SkillDifficulty;
  characteristics: CharacteristicId[];
  skills: EducationSkill[];
  description: string;
  cost: EducationCost;
};

// The record key under system.educations is the Education's stable
// identity — not duplicated here, matching ActorSkill (see skill.ts).
export type ActorEducation = {
  name: string;
  difficulty: SkillDifficulty;
  training: EducationTraining;
  selected: EducationTarget;
  characteristics: CharacteristicId[];
  skills: EducationSkill[];
  value: number;
  pinned: boolean;
  description: string;
  cost: EducationCost;
  contributions: Contributions;
};

// +5 → +10 returns cost.plus10; +10 → +5 returns -cost.plus10; same → 0.
export function educationTrainingDelta(
  previous: EducationTraining,
  next: EducationTraining,
  cost: EducationCost,
): number {
  if (previous === next) return 0;
  if (previous === "plus5" && next === "plus10") return cost.plus10;
  return -cost.plus10;
}

// Total cost refunded when removing an Education: -plus5 at +5 training,
// -(plus5 + plus10) at +10 training.
export function educationRefund(training: EducationTraining, cost: EducationCost): number {
  if (training === "plus5") return -cost.plus5;
  return -(cost.plus5 + cost.plus10);
}

export function createActorEducationFromDefinition(definition: EducationDefinition): ActorEducation {
  const selected =
    definition.characteristics[0] ??
    definition.skills[0]?.identifier ??
    "";
  return {
    name: definition.name,
    difficulty: definition.difficulty,
    training: EDUCATION_TRAININGS[0],
    selected,
    characteristics: [...definition.characteristics],
    skills: definition.skills.map(s => ({ identifier: s.identifier, name: s.name })),
    value: 0,
    pinned: false,
    description: definition.description,
    cost: { plus5: definition.cost.plus5, plus10: definition.cost.plus10 },
    contributions: [],
  };
}

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
    characteristics: new ArrayField(
      new StringField({ required: true, choices: CHARACTERISTIC_IDS }),
      { required: true, initial: [] },
    ),
    skills: new ArrayField(
      new SchemaField({
        identifier: new StringField({ required: true, initial: "" }),
        name: new StringField({ required: true, initial: "" }),
      }),
      { required: true, initial: [] },
    ),
    value: new NumberField({ required: true, initial: 0, integer: true }),
    pinned: new BooleanField({ required: true, initial: false }),
    description: new HTMLField({ required: true, initial: "" }),
    cost: new SchemaField({
      plus5: new NumberField({ required: true, initial: 0, integer: true, min: 0 }),
      plus10: new NumberField({ required: true, initial: 0, integer: true, min: 0 }),
    }),
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
