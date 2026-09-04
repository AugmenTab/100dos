import { describe, expect, it } from "vitest";
import { ACTION_TYPES, ACTIVATION_TYPES, ATTACK_ACTION_TYPES, ATTACK_CHARACTERISTIC_DEFAULTS, COST_HIDDEN_TYPES, CRITICAL_FAILURE_MAX, CRITICAL_FAILURE_MIN, CRITICAL_SUCCESS_MAX, CRITICAL_SUCCESS_MIN, DAMAGE_DICE, DAMAGE_TYPE_TAGS, DURATION_TYPES, DURATION_VALUE_TYPES, HELD_TYPES, normalizeDamageTypes, RANGE_TYPES, RANGE_VALUE_TYPES, shouldRecharge, type ActionsPoolUses, type ActionDamage, type ActionUses } from "./action.js";

describe("ACTION_TYPES", () => {
  it("contains exactly the expected action types in order", () => {
    expect(Object.keys(ACTION_TYPES)).toEqual([
      "meleeAttack",
      "rangedAttack",
      "thrownAttack",
      "healing",
      "other",
    ]);
  });
});

describe("ACTIVATION_TYPES", () => {
  it("contains exactly the expected activation types", () => {
    expect(Object.keys(ACTIVATION_TYPES)).toEqual([
      "nonaction",
      "passive",
      "free",
      "half",
      "full",
      "reaction",
      "attack",
      "round",
      "minute",
      "hour",
      "special",
    ]);
  });

});

describe("COST_HIDDEN_TYPES", () => {
  const noNumericCost = ["nonaction", "passive", "free", "half", "full", "reaction", "special"] as const;
  const numericCost = ["attack", "round", "minute", "hour"] as const;

  it("hides the numeric cost field for non-quantified types", () => {
    for (const type of noNumericCost) {
      expect(COST_HIDDEN_TYPES.has(type), type).toBe(true);
    }
  });

  it("shows the numeric cost field for quantified types", () => {
    for (const type of numericCost) {
      expect(COST_HIDDEN_TYPES.has(type), type).toBe(false);
    }
  });
});

describe("RANGE_TYPES", () => {
  it("contains exactly the expected range types in order", () => {
    expect(Object.keys(RANGE_TYPES)).toEqual([
      "none",
      "personal",
      "touch",
      "melee",
      "meters",
      "special",
      "seeText",
      "unlimited",
    ]);
  });
});

describe("RANGE_VALUE_TYPES", () => {
  it("exposes a value field for meters and special", () => {
    expect(RANGE_VALUE_TYPES.has("meters")).toBe(true);
    expect(RANGE_VALUE_TYPES.has("special")).toBe(true);
  });

  it("does not expose a value field for non-value range types", () => {
    for (const type of ["none", "personal", "touch", "melee", "seeText", "unlimited"] as const) {
      expect(RANGE_VALUE_TYPES.has(type), type).toBe(false);
    }
  });
});

describe("DURATION_TYPES", () => {
  it("contains exactly the expected duration types in order", () => {
    expect(Object.keys(DURATION_TYPES)).toEqual([
      "na",
      "instantaneous",
      "round",
      "minute",
      "hour",
      "day",
      "month",
      "year",
      "permanent",
      "seeText",
      "special",
    ]);
  });

  it("does not contain a turn type", () => {
    expect(Object.keys(DURATION_TYPES)).not.toContain("turn");
  });
});

describe("DURATION_VALUE_TYPES", () => {
  it("exposes a value field for timed and special durations", () => {
    for (const type of ["round", "minute", "hour", "day", "month", "year", "special"] as const) {
      expect(DURATION_VALUE_TYPES.has(type), type).toBe(true);
    }
  });

  it("does not expose a value field for non-timed durations", () => {
    for (const type of ["na", "instantaneous", "permanent", "seeText"] as const) {
      expect(DURATION_VALUE_TYPES.has(type), type).toBe(false);
    }
  });
});

describe("ActionsPoolUses", () => {
  it("formula is a flat string, not a nested object", () => {
    const uses: ActionsPoolUses = { per: "unlimited", value: 0, max: 0, formula: "" };
    expect(typeof uses.formula).toBe("string");
  });
});

describe("ActionUses", () => {
  it("formula is a flat string for maximum uses", () => {
    const uses: ActionUses = {
      per: "unlimited", value: 0, max: 0, formula: "",
      itemCost: { value: 0, formula: "", perAttack: false },
      actionCost: { value: 0, formula: "", perAttack: false },
    };
    expect(typeof uses.formula).toBe("string");
  });

  it("has independent itemCost and actionCost structures", () => {
    const uses: ActionUses = {
      per: "unlimited", value: 0, max: 0, formula: "",
      itemCost: { value: 2, formula: "@str.mod", perAttack: true },
      actionCost: { value: 1, formula: "", perAttack: false },
    };
    expect(uses.itemCost.value).toBe(2);
    expect(uses.itemCost.formula).toBe("@str.mod");
    expect(uses.itemCost.perAttack).toBe(true);
    expect(uses.actionCost.value).toBe(1);
    expect(uses.actionCost.perAttack).toBe(false);
  });
});

describe("ATTACK_ACTION_TYPES", () => {
  it("includes melee, ranged, and thrown attack types", () => {
    expect(ATTACK_ACTION_TYPES.has("meleeAttack")).toBe(true);
    expect(ATTACK_ACTION_TYPES.has("rangedAttack")).toBe(true);
    expect(ATTACK_ACTION_TYPES.has("thrownAttack")).toBe(true);
  });

  it("excludes healing and other", () => {
    expect(ATTACK_ACTION_TYPES.has("healing")).toBe(false);
    expect(ATTACK_ACTION_TYPES.has("other")).toBe(false);
  });
});

describe("HELD_TYPES", () => {
  it("contains exactly Default, One-Handed, and Two-Handed", () => {
    expect(Object.keys(HELD_TYPES)).toEqual(["default", "oneHanded", "twoHanded"]);
  });
});

describe("ATTACK_CHARACTERISTIC_DEFAULTS", () => {
  it("defaults Melee Attack to WFM", () => {
    expect(ATTACK_CHARACTERISTIC_DEFAULTS["meleeAttack"]).toBe("wfm");
  });

  it("defaults Ranged Attack to WFR", () => {
    expect(ATTACK_CHARACTERISTIC_DEFAULTS["rangedAttack"]).toBe("wfr");
  });

  it("defaults Thrown Attack to WFM", () => {
    expect(ATTACK_CHARACTERISTIC_DEFAULTS["thrownAttack"]).toBe("wfm");
  });
});

describe("Critical threshold ranges", () => {
  it("Critical Success slider runs from 1 to 10", () => {
    expect(CRITICAL_SUCCESS_MIN).toBe(1);
    expect(CRITICAL_SUCCESS_MAX).toBe(10);
  });

  it("Critical Failure slider runs from 90 to 100", () => {
    expect(CRITICAL_FAILURE_MIN).toBe(90);
    expect(CRITICAL_FAILURE_MAX).toBe(100);
  });
});

describe("shouldRecharge", () => {
  it("never recharges unlimited or charges periods", () => {
    expect(shouldRecharge("day", "unlimited")).toBe(false);
    expect(shouldRecharge("encounter", "unlimited")).toBe(false);
    expect(shouldRecharge("day", "charges")).toBe(false);
    expect(shouldRecharge("encounter", "charges")).toBe(false);
  });

  describe("encounter period", () => {
    it("recharges from the encounter trigger", () => {
      expect(shouldRecharge("encounter", "encounter")).toBe(true);
    });

    it("recharges from day (daily refill covers encounter uses)", () => {
      expect(shouldRecharge("day", "encounter")).toBe(true);
    });

    it("does not recharge from shorter time-based triggers", () => {
      expect(shouldRecharge("hour", "encounter")).toBe(false);
      expect(shouldRecharge("minute", "encounter")).toBe(false);
    });
  });

  describe("encounter trigger", () => {
    it("only restores encounter-period actions", () => {
      expect(shouldRecharge("encounter", "day")).toBe(false);
      expect(shouldRecharge("encounter", "hour")).toBe(false);
      expect(shouldRecharge("encounter", "minute")).toBe(false);
    });
  });

  describe("day trigger", () => {
    it("restores day, hour, and minute actions", () => {
      expect(shouldRecharge("day", "day")).toBe(true);
      expect(shouldRecharge("day", "hour")).toBe(true);
      expect(shouldRecharge("day", "minute")).toBe(true);
    });
  });

  describe("hour trigger", () => {
    it("restores hour and minute actions", () => {
      expect(shouldRecharge("hour", "hour")).toBe(true);
      expect(shouldRecharge("hour", "minute")).toBe(true);
    });

    it("does not restore day actions", () => {
      expect(shouldRecharge("hour", "day")).toBe(false);
    });
  });

  describe("minute trigger", () => {
    it("restores only minute actions", () => {
      expect(shouldRecharge("minute", "minute")).toBe(true);
    });

    it("does not restore hour or day actions", () => {
      expect(shouldRecharge("minute", "hour")).toBe(false);
      expect(shouldRecharge("minute", "day")).toBe(false);
    });
  });
});

describe("DAMAGE_DICE", () => {
  it("supports D5", () => {
    expect("d5" in DAMAGE_DICE).toBe(true);
  });

  it("supports D10", () => {
    expect("d10" in DAMAGE_DICE).toBe(true);
  });

  it("contains exactly D5 and D10", () => {
    expect(Object.keys(DAMAGE_DICE)).toEqual(["d5", "d10"]);
  });
});

describe("DAMAGE_TYPE_TAGS", () => {
  it("renders Universal as [UD]", () => {
    expect(DAMAGE_TYPE_TAGS["universal"]).toBe("[UD]");
  });

  it("renders Piercing as [PD]", () => {
    expect(DAMAGE_TYPE_TAGS["piercing"]).toBe("[PD]");
  });

  it("renders Bludgeoning as [BD]", () => {
    expect(DAMAGE_TYPE_TAGS["bludgeoning"]).toBe("[BD]");
  });

  it("renders Slashing as [SD]", () => {
    expect(DAMAGE_TYPE_TAGS["slashing"]).toBe("[SD]");
  });

  it("derives a space-separated tag string from multiple types", () => {
    const types = ["piercing", "slashing"] as const;
    const label = types.map(t => DAMAGE_TYPE_TAGS[t]).join(" ");
    expect(label).toBe("[PD] [SD]");
  });
});

describe("normalizeDamageTypes", () => {
  it("normalizes empty selection to [UD]", () => {
    expect(normalizeDamageTypes([])).toEqual(["universal"]);
  });

  it("normalizes Universal selection to [UD] only", () => {
    expect(normalizeDamageTypes(["universal"])).toEqual(["universal"]);
  });

  it("normalizes Universal plus other types to [UD] only", () => {
    expect(normalizeDamageTypes(["universal", "piercing"])).toEqual(["universal"]);
  });

  it("normalizes all three physical types to [UD]", () => {
    expect(normalizeDamageTypes(["piercing", "bludgeoning", "slashing"])).toEqual(["universal"]);
  });

  it("preserves a single physical type", () => {
    expect(normalizeDamageTypes(["piercing"])).toEqual(["piercing"]);
    expect(normalizeDamageTypes(["bludgeoning"])).toEqual(["bludgeoning"]);
    expect(normalizeDamageTypes(["slashing"])).toEqual(["slashing"]);
  });

  it("preserves any valid two-type physical combination", () => {
    expect(normalizeDamageTypes(["piercing", "bludgeoning"])).toEqual(["piercing", "bludgeoning"]);
    expect(normalizeDamageTypes(["piercing", "slashing"])).toEqual(["piercing", "slashing"]);
    expect(normalizeDamageTypes(["bludgeoning", "slashing"])).toEqual(["bludgeoning", "slashing"]);
  });
});

describe("ActionDamage", () => {
  it("defaults damage types to [UD]", () => {
    const damage: ActionDamage = {
      dice: { count: 0, die: "d5" },
      base: "",
      pierce: "",
      types: ["universal"],
    };
    expect(damage.types).toEqual(["universal"]);
  });

  it("dice count may be 0", () => {
    const damage: ActionDamage = {
      dice: { count: 0, die: "d10" },
      base: "8",
      pierce: "",
      types: ["universal"],
    };
    expect(damage.dice.count).toBe(0);
  });
});
