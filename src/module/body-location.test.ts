import { beforeAll, describe, expect, it } from "vitest";
import {
  BODY_LOCATION_TYPES,
  type BodyLocation,
  bodyLocationFields,
  bodyLocationsField,
  orderedBodyLocations,
  sortLocationsForDisplay,
} from "./body-location.js";
import { damageResistanceField } from "./damage-resistance.js";
import { FakeElementField, FakeSchemaField, fake, installFakeFoundryFields } from "../test-support/fake-fields.js";

beforeAll(installFakeFoundryFields);

function location(overrides: Partial<BodyLocation> = {}): BodyLocation {
  return { type: "arm", label: "", placement: "none", order: 0, ...overrides };
}

describe("sortLocationsForDisplay", () => {
  it("sorts by order first, then left/right/none placement", () => {
    const sorted = sortLocationsForDisplay([
      location({ label: "none-0", placement: "none" }),
      location({ label: "right-0", placement: "right" }),
      location({ label: "left-1", placement: "left", order: 1 }),
      location({ label: "left-0", placement: "left" }),
    ]);
    expect(sorted.map((l) => l.label)).toEqual(["left-0", "right-0", "none-0", "left-1"]);
  });

  it("ignores the label entirely", () => {
    const sorted = sortLocationsForDisplay([
      location({ label: "Left Arm", placement: "right" }),
      location({ label: "Right Arm", placement: "left" }),
    ]);
    expect(sorted.map((l) => l.label)).toEqual(["Right Arm", "Left Arm"]);
  });

  it("keeps extra properties (keys, Damage Resistance state) through the sort", () => {
    const sorted = sortLocationsForDisplay([
      { ...location({ placement: "right" }), key: "rightArm", value: 9 },
      { ...location({ placement: "left" }), key: "leftArm", value: 4 },
    ]);
    expect(sorted).toEqual([
      { ...location({ placement: "left" }), key: "leftArm", value: 4 },
      { ...location({ placement: "right" }), key: "rightArm", value: 9 },
    ]);
  });

  it("does not mutate its input", () => {
    const input = [location({ placement: "right" }), location({ placement: "left" })];
    sortLocationsForDisplay(input);
    expect(input[0]!.placement).toBe("right");
  });
});

describe("orderedBodyLocations", () => {
  it("orders by category, then display order within each, and keeps each key", () => {
    const ordered = orderedBodyLocations({
      tail: location({ type: "tail", label: "Tail" }),
      rightArm: location({ type: "arm", label: "Right Arm", placement: "right" }),
      head: location({ type: "head", label: "Head" }),
      leftArm: location({ type: "arm", label: "Left Arm", placement: "left" }),
    });
    expect(ordered.map((l) => l.key)).toEqual(["head", "leftArm", "rightArm", "tail"]);
  });

  it("accommodates arbitrary non-humanoid anatomy", () => {
    const ordered = orderedBodyLocations({
      head1: location({ type: "head", label: "Left Head", placement: "left" }),
      head2: location({ type: "head", label: "Right Head", placement: "right" }),
      torsoFront: location({ type: "torso", label: "Front Torso" }),
      torsoRear: location({ type: "torso", label: "Rear Torso", order: 1 }),
      leftWing: location({ type: "wing", label: "Left Wing", placement: "left" }),
      rightWing: location({ type: "wing", label: "Right Wing", placement: "right" }),
    });
    expect(ordered.map((l) => l.key)).toEqual(["head1", "head2", "torsoFront", "torsoRear", "leftWing", "rightWing"]);
  });
});

describe("bodyLocationFields", () => {
  it("holds only the anatomical fields", () => {
    expect(Object.keys(bodyLocationFields())).toEqual(["type", "label", "placement", "order"]);
  });

  it("constrains type and placement to their categories", () => {
    const fields = bodyLocationFields() as unknown as Record<string, FakeSchemaField>;
    expect(fields.type!.options).toMatchObject({ choices: BODY_LOCATION_TYPES, initial: "head" });
    expect(fields.placement!.options).toMatchObject({ choices: ["left", "right", "none"], initial: "none" });
    expect(fields.order!.options).toMatchObject({ integer: true, initial: 0 });
  });
});

describe("bodyLocationsField", () => {
  it("is a keyed collection of anatomical locations only", () => {
    const field = fake<FakeElementField>(bodyLocationsField({ nullable: false }));
    expect(Object.keys(fake<FakeSchemaField>(field.element).fields)).toEqual(["type", "label", "placement", "order"]);
  });

  it("a required collection starts empty and is not nullable", () => {
    expect(fake<FakeElementField>(bodyLocationsField({ nullable: false })).options).toEqual({
      required: true,
      nullable: false,
      initial: {},
    });
  });

  it("a nullable collection starts null", () => {
    expect(fake<FakeElementField>(bodyLocationsField({ nullable: true })).options).toEqual({
      required: true,
      nullable: true,
      initial: null,
    });
  });
});

describe("damageResistanceField", () => {
  it("composes the anatomical fields with Actor-specific Damage Resistance state", () => {
    const field = fake<FakeElementField>(damageResistanceField());
    expect(Object.keys(fake<FakeSchemaField>(field.element).fields)).toEqual([
      "type",
      "label",
      "placement",
      "order",
      "destroyed",
      "value",
      "contributions",
    ]);
  });

  it("still starts as an empty collection", () => {
    expect(fake<FakeElementField>(damageResistanceField()).options).toEqual({ required: true, initial: {} });
  });
});
