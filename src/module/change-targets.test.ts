import { describe, expect, it } from "vitest";
import { buildChangeTargetCategories } from "./change-targets.js";

const localize = (key: string): string => key;

describe("buildChangeTargetCategories damage targets", () => {
  const categories = buildChangeTargetCategories(localize);
  const damage = categories.find(c => c.id === "damage");

  it("includes specialDamage in the damage category", () => {
    expect(damage?.targets.some(t => t.target === "specialDamage")).toBe(true);
  });

  it("includes inboundSpecialDamage in the damage category", () => {
    expect(damage?.targets.some(t => t.target === "inboundSpecialDamage")).toBe(true);
  });

  it("uses camelCase machine names for special damage targets", () => {
    const targets = damage?.targets.map(t => t.target) ?? [];
    expect(targets).toContain("specialDamage");
    expect(targets).toContain("inboundSpecialDamage");
  });
});
