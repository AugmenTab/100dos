import { describe, expect, it } from "vitest";
import { type EducationData, type EducationCost, type EducationSkill } from "./education.js";
import {
  type ActorEducation,
  type EducationDefinition,
  createActorEducationFromDefinition,
  educationTrainingDelta,
  educationRefund,
} from "../education.js";
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

describe("createActorEducationFromDefinition", () => {
  const baseDefinition: EducationDefinition = {
    name: "Medical Education",
    identifier: "medicalEducation",
    difficulty: "basic",
    characteristics: ["int", "per"],
    skills: [
      { identifier: "medicineHuman", name: "Medicine (Human)" },
      { identifier: "investigation", name: "Investigation" },
    ],
    description: "<p>Medical training.</p>",
    cost: { plus5: 200, plus10: 400 },
  };

  it("ActorEducation contains cost", () => {
    const education: ActorEducation = createActorEducationFromDefinition(baseDefinition);
    expect(education.cost).toBeDefined();
    expect(education.cost.plus5).toBe(200);
    expect(education.cost.plus10).toBe(400);
  });

  it("ActorEducation contains characteristics", () => {
    const education: ActorEducation = createActorEducationFromDefinition(baseDefinition);
    expect(education.characteristics).toEqual(["int", "per"]);
  });

  it("ActorEducation contains skills", () => {
    const education: ActorEducation = createActorEducationFromDefinition(baseDefinition);
    expect(education.skills).toEqual([
      { identifier: "medicineHuman", name: "Medicine (Human)" },
      { identifier: "investigation", name: "Investigation" },
    ]);
  });

  it("ActorEducation does not have options field", () => {
    const education: ActorEducation = createActorEducationFromDefinition(baseDefinition);
    expect(education).not.toHaveProperty("options");
  });

  it("item name copies to actor education name", () => {
    const education = createActorEducationFromDefinition(baseDefinition);
    expect(education.name).toBe("Medical Education");
  });

  it("difficulty copies", () => {
    const education = createActorEducationFromDefinition(baseDefinition);
    expect(education.difficulty).toBe("basic");
  });

  it("characteristics copy", () => {
    const education = createActorEducationFromDefinition(baseDefinition);
    expect(education.characteristics).toEqual(["int", "per"]);
  });

  it("permitted skills copy with identifier and display name", () => {
    const education = createActorEducationFromDefinition(baseDefinition);
    expect(education.skills[0]).toEqual({ identifier: "medicineHuman", name: "Medicine (Human)" });
    expect(education.skills[1]).toEqual({ identifier: "investigation", name: "Investigation" });
  });

  it("description copies", () => {
    const education = createActorEducationFromDefinition(baseDefinition);
    expect(education.description).toBe("<p>Medical training.</p>");
  });

  it("cost copies plus5 and plus10", () => {
    const education = createActorEducationFromDefinition(baseDefinition);
    expect(education.cost.plus5).toBe(200);
    expect(education.cost.plus10).toBe(400);
  });

  it("nested arrays are independent copies", () => {
    const education = createActorEducationFromDefinition(baseDefinition);
    education.characteristics.push("str");
    expect(baseDefinition.characteristics).toHaveLength(2);
    education.skills.push({ identifier: "stealth", name: "Stealth" });
    expect(baseDefinition.skills).toHaveLength(2);
  });

  it("skill objects inside skills are independent copies", () => {
    const education = createActorEducationFromDefinition(baseDefinition);
    const firstSkill = education.skills[0]!;
    firstSkill.name = "MODIFIED";
    expect(baseDefinition.skills[0]!.name).toBe("Medicine (Human)");
  });

  it("actor-only fields initialize correctly", () => {
    const education = createActorEducationFromDefinition(baseDefinition);
    expect(education.training).toBe("plus5");
    expect(education.value).toBe(0);
    expect(education.pinned).toBe(false);
    expect(education.contributions).toEqual([]);
  });

  it("selected initializes from first characteristic when available", () => {
    const education = createActorEducationFromDefinition(baseDefinition);
    expect(education.selected).toBe("int");
  });

  it("selected falls back to first skill identifier when no characteristics exist", () => {
    const definition: EducationDefinition = {
      ...baseDefinition,
      characteristics: [],
    };
    const education = createActorEducationFromDefinition(definition);
    expect(education.selected).toBe("medicineHuman");
  });

  it("selected becomes empty string when no permitted targets exist", () => {
    const definition: EducationDefinition = {
      ...baseDefinition,
      characteristics: [],
      skills: [],
    };
    const education = createActorEducationFromDefinition(definition);
    expect(education.selected).toBe("");
  });
});

describe("Actor Education target option derivation", () => {
  it("characteristic targets produce localization keys not raw identifiers", () => {
    const characteristics = ["int", "per"] as const;
    const options = characteristics.map((id) => ({
      value: id,
      label: `DOS100.characteristic.${id}.abbr`,
    }));
    expect(options[0]!.label).toBe("DOS100.characteristic.int.abbr");
    expect(options[1]!.label).toBe("DOS100.characteristic.per.abbr");
  });

  it("skill targets use stored name, not identifier", () => {
    const skills: EducationSkill[] = [{ identifier: "medicineHuman", name: "Medicine (Human)" }];
    const options = skills.map((s) => ({ value: s.identifier, label: s.name }));
    expect(options[0]!.label).toBe("Medicine (Human)");
    expect(options[0]!.value).toBe("medicineHuman");
  });

  it("skill option label is never the raw identifier for a properly stored skill", () => {
    const skills: EducationSkill[] = [{ identifier: "medicineHuman", name: "Medicine (Human)" }];
    const option = { value: skills[0]!.identifier, label: skills[0]!.name };
    expect(option.label).not.toBe(option.value);
  });
});

describe("Actor Education identifier collision detection", () => {
  it("duplicate identifier is detected in existing educations", () => {
    const existing: Record<string, unknown> = { medicalEducation: {} };
    expect("medicalEducation" in existing).toBe(true);
  });

  it("unique identifier passes collision check", () => {
    const existing: Record<string, unknown> = { medicalEducation: {} };
    expect("combatTraining" in existing).toBe(false);
  });
});

describe("educationTrainingDelta", () => {
  const cost: EducationCost = { plus5: 200, plus10: 400 };

  it("plus5 to plus10 returns cost.plus10", () => {
    expect(educationTrainingDelta("plus5", "plus10", cost)).toBe(400);
  });

  it("plus10 to plus5 returns negative cost.plus10", () => {
    expect(educationTrainingDelta("plus10", "plus5", cost)).toBe(-400);
  });

  it("same training returns zero", () => {
    expect(educationTrainingDelta("plus5", "plus5", cost)).toBe(0);
    expect(educationTrainingDelta("plus10", "plus10", cost)).toBe(0);
  });

  it("does not mutate stored cost", () => {
    const original = { plus5: 200, plus10: 400 };
    educationTrainingDelta("plus5", "plus10", original);
    expect(original.plus5).toBe(200);
    expect(original.plus10).toBe(400);
  });
});

describe("educationRefund", () => {
  const cost: EducationCost = { plus5: 200, plus10: 400 };

  it("at plus5 returns negative cost.plus5", () => {
    expect(educationRefund("plus5", cost)).toBe(-200);
  });

  it("at plus10 returns negative sum of plus5 and plus10", () => {
    expect(educationRefund("plus10", cost)).toBe(-600);
  });

  it("does not mutate stored cost", () => {
    const original = { plus5: 200, plus10: 400 };
    educationRefund("plus10", original);
    expect(original.plus5).toBe(200);
    expect(original.plus10).toBe(400);
  });
});

describe("Actor Education permitted skill duplicate detection", () => {
  it("duplicate skill identifier is rejected before appending", () => {
    const skills: EducationSkill[] = [{ identifier: "medicineHuman", name: "Medicine (Human)" }];
    const isDuplicate = skills.some(s => s.identifier === "medicineHuman");
    expect(isDuplicate).toBe(true);
  });

  it("non-duplicate skill passes check", () => {
    const skills: EducationSkill[] = [{ identifier: "medicineHuman", name: "Medicine (Human)" }];
    const isDuplicate = skills.some(s => s.identifier === "stealth");
    expect(isDuplicate).toBe(false);
  });
});
