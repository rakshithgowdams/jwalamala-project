import { site } from "@/config/site";
import type { Locale } from "./strings";
/**
 * Content columns are stored per language (title_kn / title_en). Kannada is the
 * source of record, so it stands in whenever a translation has not been written.
 * Locales without their own column fall back to Kannada for the same reason.
 */
export function pickText(
  locale: Locale,
  kannada: string,
  english?: string | null,
  hindi?: string | null,
) {
  if (locale === "en") return english || kannada;
  if (locale === "hi") return hindi || kannada;
  return kannada;
}
export function brandName(locale: Locale) {
  if (locale === "en") return site.englishName;
  if (locale === "hi") return site.hindiName;
  return site.fullName;
}
export function brandDescription(locale: Locale) {
  if (locale === "en") return site.englishDescription;
  if (locale === "hi") return site.hindiDescription;
  return site.description;
}
/** The wordmark styles the trailing word separately from the leading one. */
export function brandParts(locale: Locale) {
  const full = brandName(locale);
  const mark = full.split(" ")[0];
  return { full, mark, suffix: full.slice(mark.length) };
}
/** For Intl formatters, which need a BCP 47 tag rather than our locale key. */
export function intlLocale(locale: Locale) {
  return { kn: "kn-IN", en: "en-IN", hi: "hi-IN" }[locale];
}
