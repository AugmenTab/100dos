import { type Contributions, contributionsField } from "./contribution.js";

export type MovementMode = "land" | "climb" | "swim" | "fly" | "burrow";

export type MovementSpeed = {
  formula: string;
  value: number;
  contributions: Contributions;
};

export type BaseMovement = {
  half: MovementSpeed;
  full: MovementSpeed;
};

export type AdvancedMovement = {
  charge: MovementSpeed;
  run: MovementSpeed;
  sprint: MovementSpeed | null;
};

export type Movement = BaseMovement & AdvancedMovement;

export type LandMovement = {
  jump: MovementSpeed;
  leap: MovementSpeed;
  climb: MovementSpeed;
  swim: BaseMovement;
};

export type ActorMovement = {
  mode: MovementMode;
  base: Movement & LandMovement;
  climb: Movement | null;
  swim: Movement | null;
  fly: Movement | null;
  burrow: BaseMovement | null;
};

function movementSpeedFields(): Record<string, foundry.data.fields.DataField> {
  const { StringField, NumberField } = foundry.data.fields;
  return {
    formula: new StringField({ required: true, initial: "" }),
    value: new NumberField({ required: true, initial: 0, integer: true }),
    contributions: contributionsField(),
  };
}

function movementSpeedField(): foundry.data.fields.SchemaField {
  const { SchemaField } = foundry.data.fields;
  return new SchemaField(movementSpeedFields());
}

function nullableMovementSpeedField(): foundry.data.fields.SchemaField {
  const { SchemaField } = foundry.data.fields;
  return new SchemaField(movementSpeedFields(), { required: false, nullable: true, initial: null });
}

function baseMovementFields(): Record<string, foundry.data.fields.DataField> {
  return {
    half: movementSpeedField(),
    full: movementSpeedField(),
  };
}

function baseMovementField(): foundry.data.fields.SchemaField {
  const { SchemaField } = foundry.data.fields;
  return new SchemaField(baseMovementFields());
}

function nullableBaseMovementField(): foundry.data.fields.SchemaField {
  const { SchemaField } = foundry.data.fields;
  return new SchemaField(baseMovementFields(), { required: false, nullable: true, initial: null });
}

function movementFields(): Record<string, foundry.data.fields.DataField> {
  return {
    ...baseMovementFields(),
    charge: movementSpeedField(),
    run: movementSpeedField(),
    sprint: nullableMovementSpeedField(),
  };
}

function nullableMovementField(): foundry.data.fields.SchemaField {
  const { SchemaField } = foundry.data.fields;
  return new SchemaField(movementFields(), { required: false, nullable: true, initial: null });
}

function landMovementFields(): Record<string, foundry.data.fields.DataField> {
  return {
    jump: movementSpeedField(),
    leap: movementSpeedField(),
    climb: movementSpeedField(),
    swim: baseMovementField(),
  };
}

export function actorMovementField(): foundry.data.fields.SchemaField {
  const { SchemaField, StringField } = foundry.data.fields;
  return new SchemaField({
    mode: new StringField({
      required: true,
      initial: "land",
      choices: ["land", "climb", "swim", "fly", "burrow"],
    }),
    base: new SchemaField({
      ...movementFields(),
      ...landMovementFields(),
    }),
    climb: nullableMovementField(),
    swim: nullableMovementField(),
    fly: nullableMovementField(),
    burrow: nullableBaseMovementField(),
  });
}
