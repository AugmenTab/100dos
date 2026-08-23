import { describe, expect, it } from "vitest";
import { type Encumbrance, encumbranceBands } from "./encumbrance.js";

function threshold(value: number) {
  return { value, contributions: [] };
}

function encumbrance(felt: number): Encumbrance {
  return {
    carried: 0,
    felt,
    total: 0,
    thresholds: {
      base: {
        carry: threshold(50),
        encumbered: threshold(100),
        heavy: threshold(150),
        lift: threshold(150),
        push: threshold(250),
      },
      swim: {
        carry: threshold(20),
        encumbered: threshold(40),
        heavy: threshold(60),
        maximum: threshold(80),
      },
      fly: {
        carry: threshold(10),
        encumbered: threshold(20),
      },
    },
  };
}

describe("encumbranceBands", () => {
  it("fills sequential base bands per the plan's worked example (Felt 75, thresholds 50/100/150)", () => {
    const bands = encumbranceBands(encumbrance(75), "land");
    expect(bands).toEqual([
      { labelKey: "normal", thresholdValue: 50, fillPercent: 100 },
      { labelKey: "overEncumbered", thresholdValue: 100, fillPercent: 50 },
      { labelKey: "heavilyEncumbered", thresholdValue: 150, fillPercent: 0 },
    ]);
  });

  it("treats climb and burrow the same as land (the base track)", () => {
    expect(encumbranceBands(encumbrance(75), "climb")).toEqual(encumbranceBands(encumbrance(75), "land"));
    expect(encumbranceBands(encumbrance(75), "burrow")).toEqual(encumbranceBands(encumbrance(75), "land"));
  });

  it("renders four sequential bands for swim", () => {
    const bands = encumbranceBands(encumbrance(50), "swim");
    expect(bands.map((band) => band.labelKey)).toEqual(["normal", "encumbered", "heavy", "maximumLoad"]);
    expect(bands).toEqual([
      { labelKey: "normal", thresholdValue: 20, fillPercent: 100 },
      { labelKey: "encumbered", thresholdValue: 40, fillPercent: 100 },
      { labelKey: "heavy", thresholdValue: 60, fillPercent: 50 },
      { labelKey: "maximumLoad", thresholdValue: 80, fillPercent: 0 },
    ]);
  });

  it("renders two sequential bands for fly", () => {
    const bands = encumbranceBands(encumbrance(5), "fly");
    expect(bands).toEqual([
      { labelKey: "normal", thresholdValue: 10, fillPercent: 50 },
      { labelKey: "encumbered", thresholdValue: 20, fillPercent: 0 },
    ]);
  });

  it("returns no bands for fly when the Actor has no Flight movement mode", () => {
    const noFly = encumbrance(5);
    noFly.thresholds.fly = null;
    expect(encumbranceBands(noFly, "fly")).toEqual([]);
  });

  it("never divides by zero when every threshold is still at its schema default (0)", () => {
    const zeroed = encumbrance(0);
    zeroed.thresholds.base = {
      carry: threshold(0),
      encumbered: threshold(0),
      heavy: threshold(0),
      lift: threshold(0),
      push: threshold(0),
    };
    const bands = encumbranceBands(zeroed, "land");
    expect(bands.every((band) => Number.isFinite(band.fillPercent))).toBe(true);
    expect(bands.every((band) => band.fillPercent === 0)).toBe(true);
  });

  it("keeps higher bands empty until every lower band is completely filled", () => {
    const bands = encumbranceBands(encumbrance(30), "land");
    expect(bands[0]?.fillPercent).toBe(60);
    expect(bands[1]?.fillPercent).toBe(0);
    expect(bands[2]?.fillPercent).toBe(0);
  });
});
