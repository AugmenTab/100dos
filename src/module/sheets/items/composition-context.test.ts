import { describe, expect, it } from "vitest";
import { compositionContext, type CompositionSystem } from "./composition-context.js";
import { emptyAdvances } from "../../advances.js";
import { CHARACTERISTIC_IDS } from "../../characteristic.js";

function system(overrides: Partial<CompositionSystem> = {}): CompositionSystem {
  return { advances: emptyAdvances(), ...overrides };
}

describe("compositionContext advances", () => {
  it("rows cover only nonzero entries, with localized tier options 1–5", () => {
    const { advances } = compositionContext(system({ advances: { ...emptyAdvances(), tou: 2 } }), "none");
    expect(advances.rows).toHaveLength(1);
    const [row] = advances.rows;
    expect(row!.id).toBe("tou");
    expect(row!.levelOptions.map((o) => o.labelKey)).toEqual([
      "DOS100.advances.levels.simple",
      "DOS100.advances.levels.rookie",
      "DOS100.advances.levels.intermediate",
      "DOS100.advances.levels.proficient",
      "DOS100.advances.levels.mastery",
    ]);
    expect(row!.levelOptions.find((o) => o.selected)?.value).toBe(2);
  });

  it("each row's Characteristic options exclude other rows' Characteristics", () => {
    const { advances } = compositionContext(system({ advances: { ...emptyAdvances(), str: 1, per: 3 } }), "none");
    const strOptions = advances.rows[0]!.characteristicOptions.map((o) => o.value);
    expect(strOptions).toContain("str");
    expect(strOptions).not.toContain("per");
    expect(advances.rows[0]!.characteristicOptions.find((o) => o.selected)?.value).toBe("str");
  });

  it("Add is unavailable once all ten Characteristics are represented", () => {
    const full = Object.fromEntries(CHARACTERISTIC_IDS.map((id) => [id, 1])) as ReturnType<typeof emptyAdvances>;
    expect(compositionContext(system({ advances: full }), "none").advances.canAdd).toBe(false);
    expect(compositionContext(system(), "none").advances.canAdd).toBe(true);
  });
});

describe("compositionContext foundation", () => {
  it("a Template has no foundational properties", () => {
    expect(compositionContext(system(), "none").foundation).toBeNull();
  });

  it("an unset Race lineup stays null rather than becoming zeros", () => {
    const { foundation } = compositionContext(system({ baseCharacteristics: null, baseSize: "normal", bodyLocations: {} }), "required");
    expect(foundation!.required).toBe(true);
    expect(foundation!.baseCharacteristics).toBeNull();
  });

  it("a set lineup lists all ten Characteristics in order, zeros included", () => {
    const base = Object.fromEntries(CHARACTERISTIC_IDS.map((id, i) => [id, i * 5])) as Record<(typeof CHARACTERISTIC_IDS)[number], number>;
    const { foundation } = compositionContext(system({ baseCharacteristics: base }), "optional");
    expect(foundation!.baseCharacteristics!.map((c) => c.id)).toEqual(CHARACTERISTIC_IDS);
    expect(foundation!.baseCharacteristics![0]).toEqual({ id: "str", value: 0 });
  });

  it("Mythic values keep null and zero distinct", () => {
    const { foundation } = compositionContext(
      system({ baseMythicCharacteristics: { str: 2, tou: null, agi: 0 } }),
      "optional",
    );
    expect(foundation!.baseMythicCharacteristics).toEqual([
      { id: "str", value: 2 },
      { id: "tou", value: null },
      { id: "agi", value: 0 },
    ]);
  });

  it("only an optional Size is nullable", () => {
    expect(compositionContext(system({ baseSize: "normal" }), "required").foundation!.sizeNullable).toBe(false);
    const optional = compositionContext(system({ baseSize: null }), "optional").foundation!;
    expect(optional.sizeNullable).toBe(true);
    expect(optional.sizeOptions.some((o) => o.selected)).toBe(false);
  });

  it("distinguishes absent anatomy (null) from an empty one", () => {
    expect(compositionContext(system({ bodyLocations: null }), "optional").foundation).toMatchObject({
      bodyLocationsSupplied: false,
      bodyLocations: null,
    });
    expect(compositionContext(system({ bodyLocations: {} }), "required").foundation).toMatchObject({
      bodyLocationsSupplied: true,
      bodyLocations: [],
    });
  });

  it("Body Locations are sorted for display and keep their stable keys", () => {
    const { foundation } = compositionContext(
      system({
        bodyLocations: {
          rightArm: { type: "arm", label: "Right Arm", placement: "right", order: 0 },
          head: { type: "head", label: "Head", placement: "none", order: 0 },
          leftArm: { type: "arm", label: "Left Arm", placement: "left", order: 0 },
        },
      }),
      "required",
    );
    expect(foundation!.bodyLocations!.map((l) => l.key)).toEqual(["head", "leftArm", "rightArm"]);
  });

  it("XP Cost defaults to zero when absent", () => {
    expect(compositionContext(system(), "optional").foundation!.xpCost).toBe(0);
    expect(compositionContext(system({ xpCost: 150 }), "required").foundation!.xpCost).toBe(150);
  });
});
