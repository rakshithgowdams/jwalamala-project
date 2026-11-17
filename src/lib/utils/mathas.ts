import type { Matha } from "@/lib/v4/types";
import type { Locale } from "@/lib/i18n/strings";
import { pickText } from "@/lib/i18n/content";

export const mathaName = (locale: Locale, matha: Matha) =>
  pickText(locale, matha.name_kn, matha.name_en, matha.name_hi);

export function listActiveMathas(mathas: Matha[], locale: Locale) {
  return mathas
    .filter((matha) => matha.is_active)
    .sort(
      (a, b) =>
        (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
        mathaName(locale, a).localeCompare(mathaName(locale, b), locale),
    );
}
