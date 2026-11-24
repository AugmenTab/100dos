import { describe, expect, it } from "vitest";
import { identifierProblem } from "./identifier.js";
import { CHARACTERISTIC_IDS } from "./characteristic.js";

describe("identifierProblem", () => {
  it.each(["athletics", "heavyWeapons", "skill2", "first_aid", "close-combat"])("accepts %s", (identifier) => {
    expect(identifierProblem(identifier)).toBeNull();
  });

  it.each(["", "foo.bar", "two words", "a[0]", " padded", "ümlaut"])("rejects %j as invalid", (identifier) => {
    expect(identifierProblem(identifier)).toBe("invalid");
  });

  it("rejects every Characteristic ID as reserved", () => {
    for (const id of CHARACTERISTIC_IDS) expect(identifierProblem(id)).toBe("reserved");
  });
});
