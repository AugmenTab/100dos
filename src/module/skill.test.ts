import { describe, expect, it } from "vitest";
import {
  type ActorSkill,
  type ActorSkillDefinition,
  type SkillCost,
  SKILL_DIFFICULTIES,
  SKILL_TRAININGS,
  createActorSkillRecord,
  trainingCostDelta,
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

describe("trainingCostDelta", () => {
  const cost: SkillCost = { trained: 200, plus10: 400, plus20: 600 };

  it("None → Trained returns cost.trained", () => {
    expect(trainingCostDelta("none", "trained", cost)).toBe(200);
  });

  it("Trained → +10 returns cost.plus10", () => {
    expect(trainingCostDelta("trained", "plus10", cost)).toBe(400);
  });

  it("+10 → +20 returns cost.plus20", () => {
    expect(trainingCostDelta("plus10", "plus20", cost)).toBe(600);
  });

  it("Trained → None returns -cost.trained", () => {
    expect(trainingCostDelta("trained", "none", cost)).toBe(-200);
  });

  it("+10 → Trained returns -cost.plus10", () => {
    expect(trainingCostDelta("plus10", "trained", cost)).toBe(-400);
  });

  it("+20 → +10 returns -cost.plus20", () => {
    expect(trainingCostDelta("plus20", "plus10", cost)).toBe(-600);
  });

  it("None → +20 sums all three costs", () => {
    expect(trainingCostDelta("none", "plus20", cost)).toBe(1200);
  });

  it("+20 → None refunds all three costs", () => {
    expect(trainingCostDelta("plus20", "none", cost)).toBe(-1200);
  });

  it("+20 → Trained sums the two upper-tier costs as a refund", () => {
    expect(trainingCostDelta("plus20", "trained", cost)).toBe(-1000);
  });

  it("same level returns 0", () => {
    expect(trainingCostDelta("plus10", "plus10", cost)).toBe(0);
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
