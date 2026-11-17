import type { Locale } from "./strings";

const KANNADA = /[\u0C80-\u0CFF]/g;
const DEVANAGARI = /[\u0900-\u097F]/g;

/** Kannada is the source of record, so it is never a translation target. */
export type TranslationTarget = Exclude<Locale, "kn">;

const share = (value: string, pattern: RegExp) =>
  (value.match(pattern) || []).length / [...value].length;

/**
 * How much of another script a translation may contain. Quoting the original
 * wording is legitimate journalism, so a word or two of Kannada inside a
 * paragraph passes; an echoed source, which is what a model produces when it
 * gives up rather than refusing, is almost entirely Kannada and fails. Because
 * the test is proportional it stays strict on short text, where a single foreign
 * word is a large fraction of a headline.
 */
const foreignScript = 0.1;

/** Below this, text claiming to be Hindi is not really written in Devanagari. */
const nativeScript = 0.2;

/** Whether a translation is written in the script its language uses. */
export function isUsableTranslation(
  target: TranslationTarget,
  value: string,
): boolean {
  if (![...value].length) return false;
  if (share(value, KANNADA) > foreignScript) return false;
  const devanagari = share(value, DEVANAGARI);
  return target === "hi"
    ? devanagari > nativeScript
    : devanagari <= foreignScript;
}
