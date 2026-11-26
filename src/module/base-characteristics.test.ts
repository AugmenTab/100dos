import { beforeAll, describe, expect, it } from "vitest";
import { baseCharacteristicsField, parseBaseCharacteristics } from "./base-characteristics.js";
import { CHARACTERISTIC_IDS, type CharacteristicId } from "./characteristic.js";
import { FakeSchemaField, fake, installFakeFoundryFields } from "../test-support/fake-fields.js";

beforeAll(installFakeFoundryFields);

function rawInputs(values: Partial<Record<CharacteristicId, string>> = {}): Record<CharacteristicId, string> {
  return { ...(Object.fromEntries(CHARACTERISTIC_IDS.map((id) => [id, "30"])) as Record<CharacteristicId, string>), ...values };
}

describe("baseCharacteristicsField", () => {
  it("explicitly represents all ten Characteristics", () => {
    const field = fake<FakeSchemaField>(baseCharacteristicsField());
    expect(Object.keys(field.fields)).toEqual(CHARACTERISTIC_IDS);
  });

  it("each value is a required, non-nullable whole number with no zero default", () => {
    const field = fake<FakeSchemaField>(baseCharacteristicsField());
    for (const id of CHARACTERISTIC_IDS) {
      expect(field.fields[id]!.options).toEqual({ required: true, nullable: false, integer: true, min: 0 });
      expect(field.fields[id]!.options).not.toHaveProperty("initial");
    }
  });

  it("the structure as a whole starts null rather than ten zeros", () => {
    const field = fake<FakeSchemaField>(baseCharacteristicsField());
    expect(field.options).toEqual({ required: true, nullable: true, initial: null });
  });
});

describe("parseBaseCharacteristics", () => {
  it("parses a complete lineup", () => {
    const result = parseBaseCharacteristics(rawInputs({ str: "45", ldr: "0" }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.str).toBe(45);
      expect(result.value.ldr).toBe(0);
      expect(Object.keys(result.value)).toEqual(CHARACTERISTIC_IDS);
    }
  });

  it("keeps an explicit zero as zero", () => {
    const result = parseBaseCharacteristics(rawInputs({ agi: "0" }));
    expect(result.ok && result.value.agi).toBe(0);
  });

  it("rejects a blank input instead of treating it as zero", () => {
    const result = parseBaseCharacteristics(rawInputs({ int: "", per: "  " }));
    expect(result).toMatchObject({ ok: false, errors: ["int", "per"] });
  });

  it("rejects a missing input", () => {
    const raw: Partial<Record<CharacteristicId, string>> = rawInputs();
    delete raw.cha;
    expect(parseBaseCharacteristics(raw)).toMatchObject({ ok: false, errors: ["cha"] });
  });

  it("rejects negative, fractional, and non-numeric values", () => {
    const result = parseBaseCharacteristics(rawInputs({ str: "-1", tou: "2.5", agi: "abc" }));
    expect(result).toMatchObject({ ok: false, errors: ["str", "tou", "agi"] });
  });

  it("rejects ten blank inputs rather than producing ten zeros", () => {
    const blank = Object.fromEntries(CHARACTERISTIC_IDS.map((id) => [id, ""])) as Record<CharacteristicId, string>;
    const result = parseBaseCharacteristics(blank);
    expect(result).toMatchObject({ ok: false, errors: CHARACTERISTIC_IDS });
  });
});
