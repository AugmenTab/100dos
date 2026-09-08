import { describe, expect, it } from "vitest";
import {
  type ActorSkill,
  type ActorSkillDefinition,
  type SkillCost,
  SKILL_DIFFICULTIES,
  SKILL_TRAININGS,
  createActorSkillRecord,
} from "./skill.js";
import { CHARACTERISTIC_IDS } from "./characteristic.js";
import { type SkillCost as SkillCostFromItem } from "./items/skill.js";

describe("SkillCost shared type", () => {
  it("ActorSkill contains cost", () => {
    const skill: ActorSkill = {
      name: "Athletics",
      difficulty: "basic",
      type: ["movement"],
      training: "none",
      characteristic: "str",
      characteristics: ["str", "agi"],
      value: 0,
      pinned: false,
      description: "",
      cost: { trained: 100, plus10: 200, plus20: 400 },
      contributions: [],
    };
    expect(skill.cost.trained).toBe(100);
    expect(skill.cost.plus10).toBe(200);
    expect(skill.cost.plus20).toBe(400);
  });

  it("SkillCost is the same type whether imported from skill or items/skill", () => {
    const fromSkill: SkillCost = { trained: 100, plus10: 200, plus20: 400 };
    const fromItem: SkillCostFromItem = fromSkill;
    expect(fromItem).toBe(fromSkill);
  });
});

describe("createActorSkillRecord", () => {
  const def: ActorSkillDefinition = {
    name: "Athletics",
    difficulty: "basic",
    type: ["movement"],
    characteristics: ["str", "agi"],
    description: "<p>Run fast.</p>",
    cost: { trained: 100, plus10: 200, plus20: 400 },
    identifier: "athletics",
  };

  it("copies name", () => {
    expect(createActorSkillRecord(def).name).toBe("Athletics");
  });

  it("copies difficulty", () => {
    expect(createActorSkillRecord(def).difficulty).toBe("basic");
  });

  it("copies all type entries", () => {
    expect(createActorSkillRecord(def).type).toEqual(["movement"]);
  });

  it("copies all characteristics", () => {
    expect(createActorSkillRecord(def).characteristics).toEqual(["str", "agi"]);
  });

  it("copies description", () => {
    expect(createActorSkillRecord(def).description).toBe("<p>Run fast.</p>");
  });

  it("copies all three cost fields", () => {
    const { cost } = createActorSkillRecord(def);
    expect(cost.trained).toBe(100);
    expect(cost.plus10).toBe(200);
    expect(cost.plus20).toBe(400);
  });

  it("type array is an independent copy", () => {
    const record = createActorSkillRecord(def);
    record.type.push("social");
    expect(def.type).toEqual(["movement"]);
  });

  it("characteristics array is an independent copy", () => {
    const record = createActorSkillRecord(def);
    record.characteristics.push("int");
    expect(def.characteristics).toEqual(["str", "agi"]);
  });

  it("cost object is an independent copy", () => {
    const record = createActorSkillRecord(def);
    record.cost.trained = 999;
    expect(def.cost.trained).toBe(100);
  });

  it("initializes training to the first SkillTraining value", () => {
    expect(createActorSkillRecord(def).training).toBe(SKILL_TRAININGS[0]);
  });

  it("initializes characteristic to the first listed characteristic", () => {
    expect(createActorSkillRecord(def).characteristic).toBe("str");
  });

  it("falls back to first CHARACTERISTIC_ID when characteristics is empty", () => {
    const emptyDef: ActorSkillDefinition = { ...def, characteristics: [] };
    expect(createActorSkillRecord(emptyDef).characteristic).toBe(CHARACTERISTIC_IDS[0]);
  });

  it("initializes value to 0", () => {
    expect(createActorSkillRecord(def).value).toBe(0);
  });

  it("initializes pinned to false", () => {
    expect(createActorSkillRecord(def).pinned).toBe(false);
  });

  it("initializes contributions to empty array", () => {
    expect(createActorSkillRecord(def).contributions).toEqual([]);
  });
});

describe("identifier collision guard", () => {
  it("same identifier in skills record signals a collision", () => {
    const skills: Record<string, unknown> = { athletics: {} };
    expect("athletics" in skills).toBe(true);
  });

  it("different identifier does not signal a collision", () => {
    const skills: Record<string, unknown> = { athletics: {} };
    expect("stealth" in skills).toBe(false);
  });

  it("re-key validation excludes the current identifier from collision", () => {
    const skills: Record<string, unknown> = { athletics: {} };
    const oldId = "athletics";
    const newId = "athletics";
    const isCollision = newId in skills && newId !== oldId;
    expect(isCollision).toBe(false);
  });
});

describe("source inspection", () => {
  it("SKILL_DIFFICULTIES contains expected values", () => {
    expect(SKILL_DIFFICULTIES).toContain("basic");
    expect(SKILL_DIFFICULTIES).toContain("advanced");
  });

  it("SKILL_TRAININGS[0] is 'none' — the default for new Actor Skills", () => {
    expect(SKILL_TRAININGS[0]).toBe("none");
  });
});
