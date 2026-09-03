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
});
