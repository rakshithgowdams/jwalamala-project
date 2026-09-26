import type { Post } from "@/lib/types";
import type { LocationFilters } from "./geography";
const aliases: Record<string, string[]> = {
  shravanabelagola: [
    "ಶ್ರವಣಬೆಳಗೊಳ",
    "shravana belagola",
    "shravana",
    "shravan",
    "sravanabelagola",
  ],
  dharmasthala: ["ಧರ್ಮಸ್ಥಳ", "darmastala"],
  moodbidri: ["ಮೂಡುಬಿದಿರೆ", "moodabidri", "mudabidri"],
  basadi: ["ಬಸದಿ", "ಬಸದಿಗಳು"],
  jain: ["ಜೈನ"],
  panchakalyana: ["ಪಂಚಕಲ್ಯಾಣ"],
  chaturmasa: ["ಚಾತುರ್ಮಾಸ"],
};
export function normalizeQuery(q: string) {
  return q.normalize("NFKC").toLowerCase().trim().replace(/\s+/g, " ");
}
export function searchTerms(q: string) {
  const normalized = normalizeQuery(q);
  const terms = new Set([normalized]);
  for (const [key, values] of Object.entries(aliases)) {
    if (
      [key, ...values].some(
        (v) =>
          normalized === v ||
          (normalized.length >= 4 && v.startsWith(normalized)),
      )
    ) {
      terms.add(key);
      values.forEach((v) => terms.add(v));
    }
  }
  return [...terms].filter(Boolean);
}
export type Filters = LocationFilters & {
  q?: string;
  mode?: string;
  from?: string;
  to?: string;
  category?: string;
  type?: string;
  sort?: string;
  place?: string;
  year?: string;
};
export function filterPosts(posts: Post[], f: Filters) {
  const terms = searchTerms(f.q || "");
  return posts
    .filter((p) => {
      const haystack = normalizeQuery(
        [
          p.title_kn,
          p.title_en,
          p.title_hi,
          p.title_translit,
          p.summary_kn,
          p.summary_hi,
          p.event_place,
        ]
          .filter(Boolean)
          .join(" "),
      );
      return (
        (f.mode === "event_date" ||
          !terms.length ||
          terms.some((t) => haystack.includes(t))) &&
        (!f.from || p.event_date >= f.from) &&
        (!f.to || p.event_date <= f.to) &&
        (!f.category || p.category_slugs.includes(f.category)) &&
        (!f.type || p.type === f.type) &&
        (!f.place || p.event_place === f.place) &&
        (!f.year || p.event_date.startsWith(f.year))
      );
    })
    .sort((a, b) =>
      f.sort === "most_viewed"
        ? (b.view_count || 0) - (a.view_count || 0)
        : f.sort === "event_date"
          ? b.event_date.localeCompare(a.event_date)
          : f.sort === "oldest"
            ? a.published_at.localeCompare(b.published_at)
            : b.published_at.localeCompare(a.published_at),
    );
}
