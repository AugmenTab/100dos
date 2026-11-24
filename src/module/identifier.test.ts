import { describe, expect, it } from "vitest";
import { identifierProblem, uniqueIdentifier } from "./identifier.js";
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

describe("uniqueIdentifier", () => {
  it("returns the base when it is free", () => {
    expect(uniqueIdentifier("athletics", new Set())).toBe("athletics");
  });

  it("appends the first free counter starting at 2", () => {
    expect(uniqueIdentifier("athletics", new Set(["athletics", "athletics2"]))).toBe("athletics3");
  });

  it("suffixes a reserved Characteristic ID", () => {
    expect(uniqueIdentifier("str", new Set(CHARACTERISTIC_IDS))).toBe("str2");
  });
});
