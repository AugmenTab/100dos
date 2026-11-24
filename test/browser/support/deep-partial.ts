// Fixture overrides are typed as DeepPartial<real src type>: a test supplies
// only the fields it cares about, but every key and leaf type it does supply
// is checked against the system's actual schema types, so a schema change
// (a renamed field, a reshaped value) fails typecheck:browser instead of
// silently rendering a stale shape.
export type DeepPartial<T> = T extends readonly (infer U)[]
  ? DeepPartial<U>[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;
