import {
  kn,
  v4,
  months,
  weekdays,
  aqiLabels,
  weatherLabels,
  pushLabels,
} from "@/content/strings.kn";
import {
  en,
  v4en,
  monthsEn,
  weekdaysEn,
  aqiLabelsEn,
  weatherLabelsEn,
  pushLabelsEn,
} from "@/content/strings.en";
import {
  hi,
  v4hi,
  monthsHi,
  weekdaysHi,
  aqiLabelsHi,
  weatherLabelsHi,
  pushLabelsHi,
} from "@/content/strings.hi";
export const locales = ["kn", "en", "hi"] as const;
export type Locale = (typeof locales)[number];
export function isLocale(value: unknown): value is Locale {
  return locales.includes(value as Locale);
}

/** The admin keeps its own language, separate from the news site's reader cookie. */
export const LANGUAGE_COOKIE = "jwalamala-admin-language";
export const DEFAULT_LOCALE: Locale = "en";

/** Text written inline in all three languages. */
export type Tri = Record<Locale, string>;

const fromKannada = new Map<string, Partial<Record<Locale, string>>>();
for (const [source, english, hindi] of [
  [kn, en, hi],
  [v4, v4en, v4hi],
] as const)
  for (const [key, value] of Object.entries(source)) {
    if (typeof value !== "string" || fromKannada.has(value)) continue;
    fromKannada.set(value, {
      en: (english as Record<string, string>)[key],
      hi: (hindi as Record<string, string>)[key],
    });
  }

/**
 * Translates a Kannada string from the shared tables. Labels defined once at
 * module level (resource fields, menus) are Kannada values, so they are
 * translated at render time instead of import time.
 */
export function localize(locale: Locale, text: string) {
  return locale === "kn" ? text : fromKannada.get(text)?.[locale] || text;
}

export function uiStrings(locale: Locale) {
  // Kannada is the source of record: a translation table only overrides the
  // keys it actually carries, so a missing entry falls back rather than blanks.
  const table = { kn, en, hi }[locale];
  const v4Table = { kn: v4, en: v4en, hi: v4hi }[locale];
  return {
    locale,
    kn: { ...kn, ...table } as Record<keyof typeof kn, string>,
    v4: { ...v4, ...v4Table } as Record<keyof typeof v4, string>,
    // Date and measurement tables are looked up by index or code, so they have
    // to travel with the locale rather than being imported per component.
    months: { kn: months, en: monthsEn, hi: monthsHi }[locale],
    weekdays: { kn: weekdays, en: weekdaysEn, hi: weekdaysHi }[locale],
    aqiLabels: { kn: aqiLabels, en: aqiLabelsEn, hi: aqiLabelsHi }[locale],
    weatherLabels: {
      kn: weatherLabels,
      en: weatherLabelsEn,
      hi: weatherLabelsHi,
    }[locale],
    pushLabels: { kn: pushLabels, en: pushLabelsEn, hi: pushLabelsHi }[locale],
    /** Picks the active language from inline trilingual text. */
    tr: (text: Tri) => text[locale],
    /** Translates a module-level Kannada label from the shared tables. */
    l: (text: string) => localize(locale, text),
  };
}
