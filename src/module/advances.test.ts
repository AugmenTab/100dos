import { beforeAll, describe, expect, it } from "vitest";
import {
  ADVANCE_LEVEL_LABELS,
  MAX_ADVANCE,
  MIN_ADVANCE,
  advanceIncrease,
  advanceRowCharacteristicOptions,
  advanceRows,
  advancesField,
  emptyAdvances,
  isAdvanceCount,
  moveAdvanceUpdate,
  unusedAdvanceCharacteristics,
} from "./advances.js";
import { CHARACTERISTIC_IDS } from "./characteristic.js";
import { FakeSchemaField, fake, installFakeFoundryFields } from "../test-support/fake-fields.js";

beforeAll(installFakeFoundryFields);

describe("advancesField", () => {
  it("has exactly one entry per Characteristic", () => {
    const field = fake<FakeSchemaField>(advancesField());
    expect(Object.keys(field.fields)).toEqual(CHARACTERISTIC_IDS);
  });

  it("every entry is a required integer count defaulting to 0, bounded 0–5", () => {
    const field = fake<FakeSchemaField>(advancesField());
    for (const id of CHARACTERISTIC_IDS) {
      expect(field.fields[id]!.options).toEqual({ required: true, initial: 0, integer: true, min: 0, max: 5 });
    }
  });
});

describe("isAdvanceCount", () => {
  it("accepts every integer from 0 through 5", () => {
    for (let count = MIN_ADVANCE; count <= MAX_ADVANCE; count++) expect(isAdvanceCount(count)).toBe(true);
  });

  it("rejects counts outside the range, fractional counts, and non-numbers", () => {
    for (const value of [-1, 6, 2.5, Number.NaN, "3", null, undefined]) expect(isAdvanceCount(value)).toBe(false);
  });
});

describe("ADVANCE_LEVEL_LABELS", () => {
  it("labels each count from None through Mastery, indexed by the count", () => {
    expect(ADVANCE_LEVEL_LABELS).toEqual([
      "DOS100.advances.levels.none",
      "DOS100.advances.levels.simple",
      "DOS100.advances.levels.rookie",
      "DOS100.advances.levels.intermediate",
      "DOS100.advances.levels.proficient",
      "DOS100.advances.levels.mastery",
    ]);
  });
});

describe("advanceIncrease", () => {
  it("is +5 per tier", () => {
    expect([0, 1, 2, 3, 4, 5].map(advanceIncrease)).toEqual([0, 5, 10, 15, 20, 25]);
  });
});

describe("emptyAdvances", () => {
  it("is every Characteristic at zero", () => {
    expect(emptyAdvances()).toEqual(Object.fromEntries(CHARACTERISTIC_IDS.map((id) => [id, 0])));
  });
});

describe("advanceRows", () => {
  it("lists only nonzero entries, in Characteristic order", () => {
    const advances = { ...emptyAdvances(), per: 3, str: 1, tou: 2 };
    expect(advanceRows(advances)).toEqual([
      { id: "str", count: 1 },
      { id: "tou", count: 2 },
      { id: "per", count: 3 },
    ]);
  });

  it("is empty when every entry is zero", () => {
    expect(advanceRows(emptyAdvances())).toEqual([]);
  });
});

describe("unusedAdvanceCharacteristics", () => {
  it("lists Characteristics with no entry yet", () => {
    const advances = { ...emptyAdvances(), str: 1, agi: 4 };
    expect(unusedAdvanceCharacteristics(advances)).toEqual(["tou", "wfr", "wfm", "int", "per", "crg", "cha", "ldr"]);
  });

  it("is empty once all ten are represented", () => {
    const full = Object.fromEntries(CHARACTERISTIC_IDS.map((id) => [id, 1])) as ReturnType<typeof emptyAdvances>;
    expect(unusedAdvanceCharacteristics(full)).toEqual([]);
  });
});

describe("advanceRowCharacteristicOptions", () => {
  it("offers the row's own Characteristic plus unused ones, excluding other rows'", () => {
    const advances = { ...emptyAdvances(), str: 1, tou: 2 };
    const options = advanceRowCharacteristicOptions(advances, "tou");
    expect(options).toContain("tou");
    expect(options).not.toContain("str");
    expect(options).toHaveLength(9);
  });
});

describe("moveAdvanceUpdate", () => {
  it("moves the count to an unused Characteristic and zeroes the old one", () => {
    const advances = { ...emptyAdvances(), str: 3 };
    expect(moveAdvanceUpdate(advances, "str", "agi")).toEqual({ str: 0, agi: 3 });
  });

  it("refuses to move onto a Characteristic another row already uses", () => {
    const advances = { ...emptyAdvances(), str: 3, agi: 1 };
    expect(moveAdvanceUpdate(advances, "str", "agi")).toBeNull();
  });

  it("is a no-op for the same Characteristic", () => {
    expect(moveAdvanceUpdate({ ...emptyAdvances(), str: 3 }, "str", "str")).toBeNull();
  });

  it("does not mutate the source advances", () => {
    const advances = { ...emptyAdvances(), str: 3 };
    moveAdvanceUpdate(advances, "str", "agi");
    expect(advances.str).toBe(3);
  });
});
