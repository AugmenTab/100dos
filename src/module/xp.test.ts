import { describe, expect, it } from "vitest";
import { type ExperienceTransactionType } from "./xp.js";

describe("ExperienceTransactionType", () => {
  it("accepts reward", () => {
    const t: ExperienceTransactionType = "reward";
    expect(t).toBe("reward");
  });

  it("accepts purchase", () => {
    const t: ExperienceTransactionType = "purchase";
    expect(t).toBe("purchase");
  });

  it("accepts refund", () => {
    const t: ExperienceTransactionType = "refund";
    expect(t).toBe("refund");
  });
});
