import { isCharacteristicId } from "./characteristic.js";

export type Identifier = string;

export type IdentifierProblem = "invalid" | "reserved";

// Identifiers become keys in update paths (`system.skills.${identifier}`)
// and form field names, so anything a path or attribute would reinterpret —
// `.`, whitespace, brackets — is excluded. The ten Characteristic IDs are
// reserved (see isCharacteristicId) so an EducationTarget stays unambiguous.
const IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]+$/;

export function identifierProblem(identifier: string): IdentifierProblem | null {
  if (!IDENTIFIER_PATTERN.test(identifier)) return "invalid";
  if (isCharacteristicId(identifier)) return "reserved";
  return null;
}

// The localized explanation for identifierProblem(), or null when the
// identifier is usable.
export function identifierProblemMessage(identifier: string): string | null {
  const problem = identifierProblem(identifier);
  if (problem === null) return null;
  return game.i18n.format(`DOS100.identifierValidation.${problem}`, { identifier });
}
