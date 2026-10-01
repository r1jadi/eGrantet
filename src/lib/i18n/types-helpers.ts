import type { Dictionary } from "./types";
import type { NestedKeyOf } from "./types";

export type TranslationKey = NestedKeyOf<Dictionary>;

/** Placeholder values for interpolation, e.g. { count: 3 }. */
export type TranslationValues = Record<string, string | number>;
