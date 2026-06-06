export type Result<T, E = string[]> =
  | { ok: true; value: T; warnings: string[] }
  | { ok: false; errors: E; warnings: string[] };

export function ok<T>(value: T, warnings: string[] = []): Result<T> {
  return { ok: true, value, warnings };
}

export function err<E = string[]>(errors: E, warnings: string[] = []): Result<never, E> {
  return { ok: false, errors, warnings };
}

export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  if (!result.ok) return result;
  return { ok: true, value: fn(result.value), warnings: result.warnings };
}

export function bind<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> {
  if (!result.ok) return result;
  const next = fn(result.value);
  const warnings = [...result.warnings, ...next.warnings];
  if (!next.ok) return { ok: false, errors: next.errors, warnings };
  return { ok: true, value: next.value, warnings };
}

// Applies fn to each item in order, stopping at the first failure.
// Warnings from all steps up to and including the failure are preserved.
export function traverse<A, T, E>(
  items: A[],
  fn: (a: A) => Result<T, E>,
): Result<T[], E> {
  const values: T[] = [];
  const warnings: string[] = [];
  for (const item of items) {
    const result = fn(item);
    warnings.push(...result.warnings);
    if (!result.ok) return { ok: false, errors: result.errors, warnings };
    values.push(result.value);
  }
  return { ok: true, value: values, warnings };
}

// Applies fn to all items, accumulating every error rather than short-circuiting.
export function collect<T>(results: Result<T, string[]>[]): Result<T[], string[]> {
  const values: T[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const result of results) {
    warnings.push(...result.warnings);
    if (result.ok) {
      values.push(result.value);
    } else {
      errors.push(...result.errors);
    }
  }
  return errors.length > 0
    ? { ok: false, errors, warnings }
    : { ok: true, value: values, warnings };
}
