import { describe, expect, it } from "vitest";
import { buildActionUpdates } from "./action-updates.js";

const ACTION_ID = "abc123";

describe("buildActionUpdates", () => {
  it("maps form field keys to the action's path within system.actions.items", () => {
    const updates = buildActionUpdates(ACTION_ID, { identifier: "use", description: "<p>hi</p>" });
    expect(updates[`system.actions.items.${ACTION_ID}.identifier`]).toBe("use");
    expect(updates[`system.actions.items.${ACTION_ID}.description`]).toBe("<p>hi</p>");
  });

  it("persists numeric cost for cost-bearing activation types", () => {
    for (const type of ["attack", "round", "minute", "hour"] as const) {
      const updates = buildActionUpdates(ACTION_ID, { "activation.type": type, "activation.cost": 3 });
      expect(updates[`system.actions.items.${ACTION_ID}.activation.cost`], type).toBe(3);
    }
  });

  it("clears activation cost to null when switching to a no-cost type", () => {
    for (const type of ["nonaction", "passive", "free", "half", "full", "reaction", "special"] as const) {
      const updates = buildActionUpdates(ACTION_ID, { "activation.type": type, "activation.cost": 2 });
      expect(updates[`system.actions.items.${ACTION_ID}.activation.cost`], type).toBeNull();
    }
  });

  it("does not alter unrelated fields when changing activation cost", () => {
    const updates = buildActionUpdates(ACTION_ID, {
      "activation.type": "attack",
      "activation.cost": 2,
      identifier: "myAction",
      description: "<p>desc</p>",
    });
    expect(updates[`system.actions.items.${ACTION_ID}.identifier`]).toBe("myAction");
    expect(updates[`system.actions.items.${ACTION_ID}.description`]).toBe("<p>desc</p>");
  });

  it("persists target as-is", () => {
    const updates = buildActionUpdates(ACTION_ID, { target: "One living creature" });
    expect(updates[`system.actions.items.${ACTION_ID}.target`]).toBe("One living creature");
  });

  it("persists area as-is", () => {
    const updates = buildActionUpdates(ACTION_ID, { area: "All creatures within the cloud" });
    expect(updates[`system.actions.items.${ACTION_ID}.area`]).toBe("All creatures within the cloud");
  });

  it("persists range.value for value-bearing range types", () => {
    for (const type of ["meters", "special"] as const) {
      const updates = buildActionUpdates(ACTION_ID, { "range.type": type, "range.value": "10" });
      expect(updates[`system.actions.items.${ACTION_ID}.range.value`], type).toBe("10");
    }
  });

  it("clears range.value when switching to a range type without a value field", () => {
    for (const type of ["none", "personal", "touch", "melee", "seeText", "unlimited"] as const) {
      const updates = buildActionUpdates(ACTION_ID, { "range.type": type, "range.value": "10" });
      expect(updates[`system.actions.items.${ACTION_ID}.range.value`], type).toBe("");
    }
  });

  it("does not clear range.value when range.type is absent from form data", () => {
    const updates = buildActionUpdates(ACTION_ID, { target: "self" });
    expect(`system.actions.items.${ACTION_ID}.range.value` in updates).toBe(false);
  });

  it("persists duration.value for timed and special duration types", () => {
    for (const type of ["round", "minute", "hour", "day", "month", "year", "special"] as const) {
      const updates = buildActionUpdates(ACTION_ID, { "duration.type": type, "duration.value": "5" });
      expect(updates[`system.actions.items.${ACTION_ID}.duration.value`], type).toBe("5");
    }
  });

  it("clears duration.value when switching to a duration type without a value field", () => {
    for (const type of ["na", "instantaneous", "permanent", "seeText"] as const) {
      const updates = buildActionUpdates(ACTION_ID, { "duration.type": type, "duration.value": "5" });
      expect(updates[`system.actions.items.${ACTION_ID}.duration.value`], type).toBe("");
    }
  });

  it("does not clear duration.value when duration.type is absent from form data", () => {
    const updates = buildActionUpdates(ACTION_ID, { target: "self" });
    expect(`system.actions.items.${ACTION_ID}.duration.value` in updates).toBe(false);
  });

  it("persists concentration independently", () => {
    const updates = buildActionUpdates(ACTION_ID, { concentration: true });
    expect(updates[`system.actions.items.${ACTION_ID}.concentration`]).toBe(true);
  });

  it("persists dismissible independently", () => {
    const updates = buildActionUpdates(ACTION_ID, { dismissible: true });
    expect(updates[`system.actions.items.${ACTION_ID}.dismissible`]).toBe(true);
  });

  it("changing range type does not modify activation or duration", () => {
    const updates = buildActionUpdates(ACTION_ID, { "range.type": "touch" });
    expect(`system.actions.items.${ACTION_ID}.activation.cost` in updates).toBe(false);
    expect(`system.actions.items.${ACTION_ID}.duration.value` in updates).toBe(false);
  });

  it("changing duration type does not modify activation or range", () => {
    const updates = buildActionUpdates(ACTION_ID, { "duration.type": "instantaneous" });
    expect(`system.actions.items.${ACTION_ID}.activation.cost` in updates).toBe(false);
    expect(`system.actions.items.${ACTION_ID}.range.value` in updates).toBe(false);
  });

  it("maps indexed effect note fields to the action path", () => {
    const updates = buildActionUpdates(ACTION_ID, { "notes.effectNotes.0": "On hit", "notes.effectNotes.1": "On crit" });
    expect(updates[`system.actions.items.${ACTION_ID}.notes.effectNotes.0`]).toBe("On hit");
    expect(updates[`system.actions.items.${ACTION_ID}.notes.effectNotes.1`]).toBe("On crit");
  });

  it("maps indexed footnote fields to the action path", () => {
    const updates = buildActionUpdates(ACTION_ID, { "notes.footnotes.0": "See page 42" });
    expect(updates[`system.actions.items.${ACTION_ID}.notes.footnotes.0`]).toBe("See page 42");
  });

  it("persists the action maximum-uses formula as a flat string", () => {
    const updates = buildActionUpdates(ACTION_ID, { "uses.formula": "@item.level" });
    expect(updates[`system.actions.items.${ACTION_ID}.uses.formula`]).toBe("@item.level");
  });

  it("persists item charge cost formula", () => {
    const updates = buildActionUpdates(ACTION_ID, { "uses.itemCost.formula": "2" });
    expect(updates[`system.actions.items.${ACTION_ID}.uses.itemCost.formula`]).toBe("2");
  });

  it("persists item Per Attack independently", () => {
    const updates = buildActionUpdates(ACTION_ID, { "uses.itemCost.perAttack": true });
    expect(updates[`system.actions.items.${ACTION_ID}.uses.itemCost.perAttack`]).toBe(true);
    const updates2 = buildActionUpdates(ACTION_ID, { "uses.itemCost.perAttack": false });
    expect(updates2[`system.actions.items.${ACTION_ID}.uses.itemCost.perAttack`]).toBe(false);
  });

  it("persists action charge cost formula", () => {
    const updates = buildActionUpdates(ACTION_ID, { "uses.actionCost.formula": "1" });
    expect(updates[`system.actions.items.${ACTION_ID}.uses.actionCost.formula`]).toBe("1");
  });

  it("persists action Per Attack independently", () => {
    const updates = buildActionUpdates(ACTION_ID, { "uses.actionCost.perAttack": true });
    expect(updates[`system.actions.items.${ACTION_ID}.uses.actionCost.perAttack`]).toBe(true);
    const updates2 = buildActionUpdates(ACTION_ID, { "uses.actionCost.perAttack": false });
    expect(updates2[`system.actions.items.${ACTION_ID}.uses.actionCost.perAttack`]).toBe(false);
  });

  it("persists action current uses and period", () => {
    const updates = buildActionUpdates(ACTION_ID, { "uses.value": 2, "uses.per": "encounter" });
    expect(updates[`system.actions.items.${ACTION_ID}.uses.value`]).toBe(2);
    expect(updates[`system.actions.items.${ACTION_ID}.uses.per`]).toBe("encounter");
  });

  it("item and action Per Attack flags do not affect each other", () => {
    const updates = buildActionUpdates(ACTION_ID, {
      "uses.itemCost.perAttack": true,
      "uses.actionCost.perAttack": false,
    });
    expect(updates[`system.actions.items.${ACTION_ID}.uses.itemCost.perAttack`]).toBe(true);
    expect(updates[`system.actions.items.${ACTION_ID}.uses.actionCost.perAttack`]).toBe(false);
  });

  it("supports item and action costs simultaneously", () => {
    const updates = buildActionUpdates(ACTION_ID, {
      "uses.itemCost.formula": "2",
      "uses.itemCost.perAttack": true,
      "uses.actionCost.formula": "1",
      "uses.actionCost.perAttack": false,
    });
    expect(updates[`system.actions.items.${ACTION_ID}.uses.itemCost.formula`]).toBe("2");
    expect(updates[`system.actions.items.${ACTION_ID}.uses.itemCost.perAttack`]).toBe(true);
    expect(updates[`system.actions.items.${ACTION_ID}.uses.actionCost.formula`]).toBe("1");
    expect(updates[`system.actions.items.${ACTION_ID}.uses.actionCost.perAttack`]).toBe(false);
  });

  it("persists damage dice count", () => {
    const updates = buildActionUpdates(ACTION_ID, { "damage.dice.count": 4 });
    expect(updates[`system.actions.items.${ACTION_ID}.damage.dice.count`]).toBe(4);
  });

  it("persists damage dice count of 0", () => {
    const updates = buildActionUpdates(ACTION_ID, { "damage.dice.count": 0 });
    expect(updates[`system.actions.items.${ACTION_ID}.damage.dice.count`]).toBe(0);
  });

  it("persists damage dice die", () => {
    const updatesD5 = buildActionUpdates(ACTION_ID, { "damage.dice.die": "d5" });
    expect(updatesD5[`system.actions.items.${ACTION_ID}.damage.dice.die`]).toBe("d5");

    const updatesD10 = buildActionUpdates(ACTION_ID, { "damage.dice.die": "d10" });
    expect(updatesD10[`system.actions.items.${ACTION_ID}.damage.dice.die`]).toBe("d10");
  });

  it("persists base damage as a formula string", () => {
    const updates = buildActionUpdates(ACTION_ID, { "damage.base": "8" });
    expect(updates[`system.actions.items.${ACTION_ID}.damage.base`]).toBe("8");
  });

  it("persists base damage formulas containing floor(...)", () => {
    const formula = "8 + floor(@characteristics.str.mod / 2)";
    const updates = buildActionUpdates(ACTION_ID, { "damage.base": formula });
    expect(updates[`system.actions.items.${ACTION_ID}.damage.base`]).toBe(formula);
  });

  it("persists pierce as a formula string", () => {
    const updates = buildActionUpdates(ACTION_ID, { "damage.pierce": "12" });
    expect(updates[`system.actions.items.${ACTION_ID}.damage.pierce`]).toBe("12");
  });

  it("persists pierce formulas containing characteristics references", () => {
    const formula = "5 + floor(@characteristics.str.mod / 2)";
    const updates = buildActionUpdates(ACTION_ID, { "damage.pierce": formula });
    expect(updates[`system.actions.items.${ACTION_ID}.damage.pierce`]).toBe(formula);
  });

  it("persists damage types array", () => {
    const updates = buildActionUpdates(ACTION_ID, { "damage.types": ["piercing", "slashing"] });
    expect(updates[`system.actions.items.${ACTION_ID}.damage.types`]).toEqual(["piercing", "slashing"]);
  });

  it("persists all damage fields independently without affecting other fields", () => {
    const updates = buildActionUpdates(ACTION_ID, {
      "damage.dice.count": 2,
      "damage.dice.die": "d10",
      "damage.base": "8 + floor(@characteristics.str.mod / 2)",
      "damage.pierce": "12",
      "damage.types": ["universal"],
      identifier: "myAttack",
    });
    expect(updates[`system.actions.items.${ACTION_ID}.damage.dice.count`]).toBe(2);
    expect(updates[`system.actions.items.${ACTION_ID}.damage.dice.die`]).toBe("d10");
    expect(updates[`system.actions.items.${ACTION_ID}.damage.base`]).toBe("8 + floor(@characteristics.str.mod / 2)");
    expect(updates[`system.actions.items.${ACTION_ID}.damage.pierce`]).toBe("12");
    expect(updates[`system.actions.items.${ACTION_ID}.damage.types`]).toEqual(["universal"]);
    expect(updates[`system.actions.items.${ACTION_ID}.identifier`]).toBe("myAttack");
  });
});
