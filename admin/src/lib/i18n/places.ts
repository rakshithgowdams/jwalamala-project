import type { Locale } from "./strings";

/** Kannada place name to its translations, built from the places table. */
export type PlaceNameMap = Record<string, { en?: string; hi?: string }>;

/**
 * Venue chips (`posts.event_place`, `events.place`, `events.district`) store a
 * place as free text instead of a foreign key, so there is no `_hi` column to
 * read. The text is nearly always one of the Kannada names in the places table,
 * which does carry translations, so it is resolved by name at render time.
 *
 * Only display goes through here. The same columns are also compared against
 * `places.name_kn` to group posts by location, and those comparisons must keep
 * using the stored Kannada value.
 */
export function localizePlace(
  names: PlaceNameMap,
  locale: Locale,
  text?: string | null,
) {
  if (!text) return "";
  if (locale === "kn") return text;
  const found = names[text.trim()];
  return (locale === "en" ? found?.en : found?.hi) || text;
}
