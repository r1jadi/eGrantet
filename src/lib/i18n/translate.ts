import type { Locale } from "./config";
import { en } from "./dictionaries/en";
import { sq } from "./dictionaries/sq";
import { sr } from "./dictionaries/sr";

const dictionaries = { en, sq, sr } as const;

type DictionaryTree = Record<string, unknown>;

function getDictionary(locale: Locale): DictionaryTree {
  return dictionaries[locale] as unknown as DictionaryTree;
}

/** Resolves a dot-notation key against a dictionary tree. */
function resolve(tree: DictionaryTree, key: string): string | undefined {
  let node: unknown = tree;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as DictionaryTree)[part];
  }
  return typeof node === "string" ? node : undefined;
}

/** Interpolates `{name}` placeholders with provided values. */
function interpolate(template: string, values?: Record<string, unknown>): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

/**
 * Translates a key for a locale. Falls back to English when a key is missing
 * from the target dictionary, and to the key itself when missing everywhere —
 * a missing translation must never render as blank UI.
 */
export function translate(locale: Locale, key: string, values?: Record<string, unknown>): string {
  const template = resolve(getDictionary(locale), key) ?? resolve(getDictionary("en"), key);
  if (template === undefined) return key;
  return interpolate(template, values);
}

/** Hook-free translate used by `getT()` and the client hooks. */
export const translateWithValues = translate;

export type { TranslationKey, TranslationValues } from "./types-helpers";
