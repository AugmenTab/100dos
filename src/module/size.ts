// Size categories, smallest to largest (see docs/rules-reference.md, "Size
// Categories"). Each maps to DOS100.size.<id> for display.
export type Size =
  | "mini"
  | "small"
  | "normal"
  | "large"
  | "huge"
  | "hulking"
  | "giant"
  | "immense"
  | "massive"
  | "great"
  | "monumental"
  | "colossal"
  | "vast"
  | "unscalable";

export const SIZES: Size[] = [
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
];

export function isSize(value: unknown): value is Size {
  return typeof value === "string" && (SIZES as string[]).includes(value);
}

// A required Size starts at "normal", the human baseline; a nullable one
// starts null, meaning no Size is supplied. An empty form value clears a
// nullable Size back to null.
export function sizeField(options: { nullable: boolean }): foundry.data.fields.StringField {
  const { StringField } = foundry.data.fields;
  return new StringField({
    required: true,
    blank: false,
    nullable: options.nullable,
    initial: options.nullable ? null : "normal",
    choices: SIZES,
  });
}
