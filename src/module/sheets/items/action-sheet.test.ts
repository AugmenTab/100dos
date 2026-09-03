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
});
