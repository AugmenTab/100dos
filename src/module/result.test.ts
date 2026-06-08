import { describe, expect, it } from "vitest";
import { bind, collect, err, map, ok, traverse } from "./result.js";

describe("ok", () => {
  it("constructs a success with the given value and no warnings", () => {
    expect(ok(42)).toEqual({ ok: true, value: 42, warnings: [] });
  });

  it("includes provided warnings", () => {
    expect(ok("x", ["w"])).toEqual({ ok: true, value: "x", warnings: ["w"] });
  });
});

describe("err", () => {
  it("constructs a failure with the given errors and no warnings", () => {
    expect(err(["bad"])).toEqual({ ok: false, errors: ["bad"], warnings: [] });
  });

  it("includes provided warnings", () => {
    expect(err(["e"], ["w"])).toEqual({ ok: false, errors: ["e"], warnings: ["w"] });
  });
});

describe("map", () => {
  it("transforms the value on success", () => {
    expect(map(ok(2), x => x * 3)).toMatchObject({ ok: true, value: 6 });
  });

  it("preserves warnings on success", () => {
    expect(map(ok(1, ["w"]), x => x + 1)).toMatchObject({ warnings: ["w"] });
  });

  it("passes through a failure without calling fn", () => {
    let called = false;
    const result = map(err(["e"]), () => { called = true; return 0; });
    expect(result.ok).toBe(false);
    expect(called).toBe(false);
  });

  it("preserves warnings on failure", () => {
    expect(map(err(["e"], ["w"]), x => x)).toMatchObject({ warnings: ["w"] });
  });
});

describe("bind", () => {
  it("chains two successes and merges warnings", () => {
    expect(bind(ok(2, ["w1"]), x => ok(x * 3, ["w2"]))).toEqual({
      ok: true,
      value: 6,
      warnings: ["w1", "w2"],
    });
  });

  it("returns failure when the chained fn fails, merging warnings", () => {
    expect(bind(ok(2, ["w1"]), () => err(["e"], ["w2"]))).toEqual({
      ok: false,
      errors: ["e"],
      warnings: ["w1", "w2"],
    });
  });

  it("passes through a failure without calling fn", () => {
    let called = false;
    const result = bind(err(["e"], ["w"]), () => { called = true; return ok(0); });
    expect(result.ok).toBe(false);
    expect(called).toBe(false);
    expect(result.warnings).toEqual(["w"]);
  });
});

describe("traverse", () => {
  it("returns ok([]) for an empty array", () => {
    expect(traverse([], () => ok(0))).toEqual({ ok: true, value: [], warnings: [] });
  });

  it("collects all values when every item succeeds", () => {
    expect(traverse([1, 2, 3], x => ok(x * 2))).toMatchObject({ ok: true, value: [2, 4, 6] });
  });

  it("accumulates warnings from all successful steps", () => {
    expect(traverse([1, 2], x => ok(x, [`w${x}`]))).toMatchObject({
      warnings: ["w1", "w2"],
    });
  });

  it("short-circuits on the first failure and does not process later items", () => {
    const processed: number[] = [];
    const result = traverse([1, 2, 3], x => {
      processed.push(x);
      return x === 2 ? err(["fail"]) : ok(x);
    });
    expect(result.ok).toBe(false);
    expect(processed).toEqual([1, 2]);
  });

  it("preserves warnings accumulated up to and including the failure", () => {
    const result = traverse([1, 2, 3], x =>
      x === 2 ? err(["e"], ["w2"]) : ok(x, [`w${x}`]),
    );
    expect(result).toMatchObject({ ok: false, warnings: ["w1", "w2"] });
  });
});

describe("collect", () => {
  it("returns ok([]) for an empty array", () => {
    expect(collect([])).toEqual({ ok: true, value: [], warnings: [] });
  });

  it("returns all values when every result succeeds", () => {
    expect(collect([ok(1), ok(2), ok(3)])).toMatchObject({ ok: true, value: [1, 2, 3] });
  });

  it("accumulates all errors without short-circuiting", () => {
    const result = collect([err(["e1"]), ok(2), err(["e2"])]);
    expect(result).toMatchObject({ ok: false, errors: ["e1", "e2"] });
  });

  it("accumulates warnings from all results regardless of success or failure", () => {
    const result = collect([ok(1, ["w1"]), err(["e"], ["w2"])]);
    expect(result.warnings).toEqual(["w1", "w2"]);
  });
});
