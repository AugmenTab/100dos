import { beforeAll, describe, expect, it } from "vitest";
import {
  MYTHIC_CHARACTERISTIC_IDS,
  baseMythicCharacteristicsField,
  parseBaseMythicCharacteristics,
} from "./base-mythic-characteristics.js";
import { FakeSchemaField, fake, installFakeFoundryFields } from "../test-support/fake-fields.js";

beforeAll(installFakeFoundryFields);

describe("baseMythicCharacteristicsField", () => {
  it("covers STR, TOU, and AGI", () => {
    const field = fake<FakeSchemaField>(baseMythicCharacteristicsField());
    expect(Object.keys(field.fields)).toEqual(["str", "tou", "agi"]);
  });

  it("the whole structure is nullable and starts null", () => {
    const field = fake<FakeSchemaField>(baseMythicCharacteristicsField());
    expect(field.options).toEqual({ required: true, nullable: true, initial: null });
  });

  it("each value is independently nullable and starts null, not zero", () => {
    const field = fake<FakeSchemaField>(baseMythicCharacteristicsField());
    for (const id of MYTHIC_CHARACTERISTIC_IDS) {
      expect(field.fields[id]!.options).toEqual({ required: true, nullable: true, initial: null, integer: true, min: 0 });
    }
  });
});

describe("parseBaseMythicCharacteristics", () => {
  it("keeps zero, absence, and positive values distinct", () => {
    const result = parseBaseMythicCharacteristics({
      str: { present: true, value: "2" },
      tou: { present: false, value: "" },
      agi: { present: true, value: "0" },
    });
    expect(result).toMatchObject({ ok: true, value: { str: 2, tou: null, agi: 0 } });
  });

  it("stores null for an absent row even if a value was typed", () => {
    const result = parseBaseMythicCharacteristics({
      str: { present: false, value: "4" },
      tou: { present: false, value: "" },
      agi: { present: false, value: "" },
    });
    expect(result).toMatchObject({ ok: true, value: { str: null, tou: null, agi: null } });
  });

  it("treats a missing row as absent", () => {
    expect(parseBaseMythicCharacteristics({})).toMatchObject({ ok: true, value: { str: null, tou: null, agi: null } });
  });

  it("rejects a present row with no value rather than inferring zero", () => {
    const result = parseBaseMythicCharacteristics({ tou: { present: true, value: " " } });
    expect(result).toMatchObject({ ok: false, errors: ["tou"] });
  });

  it("rejects negative and fractional present values", () => {
    const result = parseBaseMythicCharacteristics({
      str: { present: true, value: "-1" },
      agi: { present: true, value: "1.5" },
    });
    expect(result).toMatchObject({ ok: false, errors: ["str", "agi"] });
  });
});
