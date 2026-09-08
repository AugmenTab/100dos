import { describe, expect, it } from "vitest";
import { type Identifier } from "../identifier.js";
import { type Identifier as IdentifierFromAbstract } from "./abstract-item.js";
import { type SkillData, type SkillCost } from "./skill.js";
import { SKILL_DIFFICULTIES, SKILL_TYPES } from "../skill.js";
import { CHARACTERISTIC_IDS } from "../characteristic.js";

describe("Identifier shared module", () => {
  it("Identifier is importable from the shared identifier module", () => {
    const id: Identifier = "testSkill";
    expect(id).toBe("testSkill");
  });

  it("Identifier is still available from abstract-item", () => {
    const id: IdentifierFromAbstract = "fromAbstract";
    expect(id).toBe("fromAbstract");
  });
});

describe("SkillData", () => {
  it("all fields default to empty/zero values via type shape", () => {
    const cost: SkillCost = { trained: 0, plus10: 0, plus20: 0 };
    const data: SkillData = {
      identifier: "",
      difficulty: SKILL_DIFFICULTIES[0],
      kinds: [],
      characteristics: [],
      description: "",
      cost,
    };
    expect(data.identifier).toBe("");
    expect(data.kinds).toEqual([]);
    expect(data.characteristics).toEqual([]);
    expect(data.cost.trained).toBe(0);
    expect(data.cost.plus10).toBe(0);
    expect(data.cost.plus20).toBe(0);
  });

  it("difficulty uses SkillDifficulty values from shared skill module", () => {
    expect(SKILL_DIFFICULTIES).toContain("basic");
    expect(SKILL_DIFFICULTIES).toContain("advanced");
  });

  it("type uses SkillType values from shared skill module", () => {
    expect(SKILL_TYPES).toContain("social");
    expect(SKILL_TYPES).toContain("movement");
    expect(SKILL_TYPES).toContain("fieldcraft");
  });

  it("characteristics uses CharacteristicId values from shared characteristic module", () => {
    expect(CHARACTERISTIC_IDS).toHaveLength(10);
    const data: SkillData = {
      identifier: "athletics",
      difficulty: "basic",
      kinds: ["movement"],
      characteristics: ["str", "agi"],
      description: "",
      cost: { trained: 100, plus10: 200, plus20: 300 },
    };
    expect(data.characteristics).toEqual(["str", "agi"]);
  });

  it("cost fields are non-negative integers by type constraint", () => {
    const cost: SkillCost = { trained: 100, plus10: 200, plus20: 400 };
    expect(cost.trained).toBeGreaterThanOrEqual(0);
    expect(cost.plus10).toBeGreaterThanOrEqual(0);
    expect(cost.plus20).toBeGreaterThanOrEqual(0);
  });
});
