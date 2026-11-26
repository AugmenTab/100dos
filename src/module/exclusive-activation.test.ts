import { describe, expect, it } from "vitest";
import {
  EXCLUSIVE_ITEM_TYPES,
  type ActivationCandidate,
  exclusiveActivationUpdates,
  selectedItemId,
} from "./exclusive-activation.js";

const items: ActivationCandidate[] = [
  { id: "human", type: "race", active: true },
  { id: "elf", type: "race", active: false },
  { id: "orc", type: "race", active: false },
  { id: "soldier", type: "soldierType", active: true },
  { id: "medic", type: "soldierType", active: false },
  { id: "veteran", type: "template", active: true },
];

describe("EXCLUSIVE_ITEM_TYPES", () => {
  it("covers Race and Soldier Type only", () => {
    expect([...EXCLUSIVE_ITEM_TYPES]).toEqual(["race", "soldierType"]);
  });
});

describe("exclusiveActivationUpdates", () => {
  it("activates the selection and deactivates the previously active Item of that type", () => {
    expect(exclusiveActivationUpdates(items, "race", "elf")).toEqual([
      { _id: "human", "system.active": false },
      { _id: "elf", "system.active": true },
    ]);
  });

  it("selecting None deactivates every Item of that type", () => {
    expect(exclusiveActivationUpdates(items, "race", null)).toEqual([{ _id: "human", "system.active": false }]);
  });

  it("re-selecting the already active Item changes nothing", () => {
    expect(exclusiveActivationUpdates(items, "race", "human")).toEqual([]);
  });

  it("never touches other types — Race and Soldier Type are independent", () => {
    const updates = exclusiveActivationUpdates(items, "soldierType", "medic");
    expect(updates).toEqual([
      { _id: "soldier", "system.active": false },
      { _id: "medic", "system.active": true },
    ]);
    expect(updates.map((u) => u._id)).not.toContain("human");
    expect(updates.map((u) => u._id)).not.toContain("veteran");
  });

  it("repairs stored data with more than one active Item of a type", () => {
    const broken: ActivationCandidate[] = [
      { id: "a", type: "race", active: true },
      { id: "b", type: "race", active: true },
    ];
    expect(exclusiveActivationUpdates(broken, "race", "b")).toEqual([{ _id: "a", "system.active": false }]);
  });

  it("an unknown selection id deactivates everything of that type", () => {
    expect(exclusiveActivationUpdates(items, "race", "missing")).toEqual([{ _id: "human", "system.active": false }]);
  });
});

describe("selectedItemId", () => {
  it("is the active Item of the type", () => {
    expect(selectedItemId(items, "race")).toBe("human");
    expect(selectedItemId(items, "soldierType")).toBe("soldier");
  });

  it("is null when none is active", () => {
    expect(selectedItemId([{ id: "elf", type: "race", active: false }], "race")).toBeNull();
  });
});
