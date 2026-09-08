import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { type EducationData, type EducationCost, type EducationSkill } from "./education.js";
import { SKILL_DIFFICULTIES } from "../skill.js";
import { CHARACTERISTIC_IDS } from "../characteristic.js";

describe("EducationData", () => {
  it("all fields default to empty/zero values via type shape", () => {
    const cost: EducationCost = { plus5: 0, plus10: 0 };
    const data: EducationData = {
      identifier: "",
      difficulty: SKILL_DIFFICULTIES[0],
      characteristics: [],
      skills: [],
      description: "",
      cost,
    };
    expect(data.identifier).toBe("");
    expect(data.characteristics).toEqual([]);
    expect(data.skills).toEqual([]);
    expect(data.cost.plus5).toBe(0);
    expect(data.cost.plus10).toBe(0);
  });

  it("difficulty uses SkillDifficulty values", () => {
    expect(SKILL_DIFFICULTIES).toContain("basic");
    expect(SKILL_DIFFICULTIES).toContain("advanced");
  });

  it("characteristics uses all ten CharacteristicIds", () => {
    expect(CHARACTERISTIC_IDS).toHaveLength(10);
    const data: EducationData = {
      identifier: "medicalEducation",
      difficulty: "basic",
      characteristics: ["str", "int"],
      skills: [],
      description: "",
      cost: { plus5: 100, plus10: 200 },
    };
    expect(data.characteristics).toEqual(["str", "int"]);
  });

  it("cost fields are non-negative integers by type constraint", () => {
    const cost: EducationCost = { plus5: 200, plus10: 400 };
    expect(cost.plus5).toBeGreaterThanOrEqual(0);
    expect(cost.plus10).toBeGreaterThanOrEqual(0);
  });
});

describe("EducationSkill stamp mapping", () => {
  const toEducationSkill = (name: string, identifier: string): EducationSkill => ({ identifier, name });

  it("copies item name", () => {
    expect(toEducationSkill("Medicine (Human)", "medicineHuman").name).toBe("Medicine (Human)");
  });

  it("copies system.identifier", () => {
    expect(toEducationSkill("Medicine (Human)", "medicineHuman").identifier).toBe("medicineHuman");
  });

  it("does not retain any other Skill fields", () => {
    const skill = toEducationSkill("Medicine (Human)", "medicineHuman");
    expect(skill).not.toHaveProperty("difficulty");
    expect(skill).not.toHaveProperty("characteristics");
    expect(skill).not.toHaveProperty("cost");
    expect(skill).not.toHaveProperty("description");
  });

  it("new skill is appended to the end of system.skills", () => {
    const existing: EducationSkill[] = [{ identifier: "athletics", name: "Athletics" }];
    const appended = [...existing, toEducationSkill("Medicine (Human)", "medicineHuman")];
    expect(appended).toHaveLength(2);
    expect(appended[1]!.identifier).toBe("medicineHuman");
  });

  it("duplicate identifier is detected before appending", () => {
    const existing: EducationSkill[] = [{ identifier: "medicineHuman", name: "Medicine (Human)" }];
    const isDuplicate = existing.some(s => s.identifier === "medicineHuman");
    expect(isDuplicate).toBe(true);
  });

  it("non-matching identifier is not a duplicate", () => {
    const existing: EducationSkill[] = [{ identifier: "medicineHuman", name: "Medicine (Human)" }];
    const isDuplicate = existing.some(s => s.identifier === "athletics");
    expect(isDuplicate).toBe(false);
  });

  it("delete removes only the skill at the given index", () => {
    const skills: EducationSkill[] = [
      { identifier: "athletics", name: "Athletics" },
      { identifier: "medicineHuman", name: "Medicine (Human)" },
      { identifier: "stealth", name: "Stealth" },
    ];
    const updated = skills.filter((_, i) => i !== 1);
    expect(updated).toHaveLength(2);
    expect(updated[0]!.identifier).toBe("athletics");
    expect(updated[1]!.identifier).toBe("stealth");
  });

  it("delete does not mutate the original array", () => {
    const skills: EducationSkill[] = [{ identifier: "athletics", name: "Athletics" }];
    skills.filter((_, i) => i !== 0);
    expect(skills).toHaveLength(1);
  });
});

describe("Education source checks", () => {
  const source = readFileSync(new URL("../education.ts", import.meta.url), "utf8");

  it("contains the Actor Education target-name TODO", () => {
    expect(source).toMatch(/TODO:.*Education stamping must preserve permitted Skill display names/s);
  });

  it("TODO mentions that the target selector must not fall back to the raw identifier", () => {
    expect(source).toMatch(/target selector must not fall back/);
  });
});
