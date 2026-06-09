import { describe, expect, it } from "vitest";
import { shouldRecharge } from "./action.js";

describe("shouldRecharge", () => {
  it("never recharges unlimited or charges periods", () => {
    expect(shouldRecharge("day", "unlimited")).toBe(false);
    expect(shouldRecharge("encounter", "unlimited")).toBe(false);
    expect(shouldRecharge("day", "charges")).toBe(false);
    expect(shouldRecharge("encounter", "charges")).toBe(false);
  });

  describe("encounter period", () => {
    it("recharges from the encounter trigger", () => {
      expect(shouldRecharge("encounter", "encounter")).toBe(true);
    });

    it("recharges from day (daily refill covers encounter uses)", () => {
      expect(shouldRecharge("day", "encounter")).toBe(true);
    });

    it("does not recharge from shorter time-based triggers", () => {
      expect(shouldRecharge("hour", "encounter")).toBe(false);
      expect(shouldRecharge("minute", "encounter")).toBe(false);
    });
  });

  describe("encounter trigger", () => {
    it("only restores encounter-period actions", () => {
      expect(shouldRecharge("encounter", "day")).toBe(false);
      expect(shouldRecharge("encounter", "hour")).toBe(false);
      expect(shouldRecharge("encounter", "minute")).toBe(false);
    });
  });

  describe("day trigger", () => {
    it("restores day, hour, and minute actions", () => {
      expect(shouldRecharge("day", "day")).toBe(true);
      expect(shouldRecharge("day", "hour")).toBe(true);
      expect(shouldRecharge("day", "minute")).toBe(true);
    });
  });

  describe("hour trigger", () => {
    it("restores hour and minute actions", () => {
      expect(shouldRecharge("hour", "hour")).toBe(true);
      expect(shouldRecharge("hour", "minute")).toBe(true);
    });

    it("does not restore day actions", () => {
      expect(shouldRecharge("hour", "day")).toBe(false);
    });
  });

  describe("minute trigger", () => {
    it("restores only minute actions", () => {
      expect(shouldRecharge("minute", "minute")).toBe(true);
    });

    it("does not restore hour or day actions", () => {
      expect(shouldRecharge("minute", "hour")).toBe(false);
      expect(shouldRecharge("minute", "day")).toBe(false);
    });
  });
});
