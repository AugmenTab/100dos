import { beforeAll, describe, expect, it } from "vitest";
import { SIZES, isSize, sizeField } from "./size.js";
import { FakeField, fake, installFakeFoundryFields } from "../test-support/fake-fields.js";

beforeAll(installFakeFoundryFields);

describe("SIZES", () => {
  it("lists every Size category, smallest to largest", () => {
    expect(SIZES).toEqual([
      "mini",
      "small",
      "normal",
      "large",
      "huge",
      "hulking",
      "giant",
      "immense",
      "massive",
      "great",
      "monumental",
      "colossal",
      "vast",
      "unscalable",
    ]);
  });
});

describe("isSize", () => {
  it("accepts known categories only", () => {
    expect(isSize("normal")).toBe(true);
    expect(isSize("Normal")).toBe(false);
    expect(isSize("")).toBe(false);
    expect(isSize(null)).toBe(false);
  });
});

describe("sizeField", () => {
  it("a required Size defaults to normal and is not nullable", () => {
    expect(fake<FakeField>(sizeField({ nullable: false })).options).toEqual({
      required: true,
      blank: false,
      nullable: false,
      initial: "normal",
      choices: SIZES,
    });
  });

  it("a nullable Size defaults to null", () => {
    expect(fake<FakeField>(sizeField({ nullable: true })).options).toMatchObject({ nullable: true, initial: null });
  });
});
