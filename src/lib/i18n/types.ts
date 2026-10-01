import type { en } from "./dictionaries/en";

/** The reference dictionary shape: typeof the English tree (values widen to string). */
export type Dictionary = typeof en;

export type TranslationKey = NestedKeyOf<Dictionary>;

/** Dot-notation keys of the reference dictionary (leaves only). */
export type NestedKeyOf<T> = T extends object
  ? { [K in keyof T & string]: NestedKeyOf<T[K]> extends never ? K : `${K}.${NestedKeyOf<T[K]>}` }[keyof T & string]
  : never;
