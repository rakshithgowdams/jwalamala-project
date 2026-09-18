import {
  kn,
  v4,
  months,
  weekdays,
  aqiLabels,
  weatherLabels,
} from "@/content/strings.kn";
import {
  en,
  v4en,
  monthsEn,
  weekdaysEn,
  aqiLabelsEn,
  weatherLabelsEn,
} from "@/content/strings.en";
import {
  hi,
  v4hi,
  monthsHi,
  weekdaysHi,
  aqiLabelsHi,
  weatherLabelsHi,
} from "@/content/strings.hi";
export const locales = ["kn", "en", "hi"] as const;
export type Locale = (typeof locales)[number];
export function isLocale(value: unknown): value is Locale {
  return locales.includes(value as Locale);
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
  };
}
