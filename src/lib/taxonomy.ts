import { mainNavigationCategories } from "@/config/navigation";
import type { Category } from "@/lib/types";

export const CATEGORY_KINDS = [
  "news",
  "kshetra",
  "programme",
  "listing",
  "upcoming",
] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export const STATE_JAIN_NEWS_SLUG = "state-jain-news";
export const JAIN_MATHA_SLUG = "jain-matha";
export const KSHETRA_PARICHAYA_SLUG = "kshetra-parichaya";
export const KIRU_PARICHAYA_SLUG = "kiru-parichaya";
export const JWALAMALA_PROGRAMMES_SLUG = "jwalamala-programmes";
export const SOCIAL_MEDIA_SLUG = "social-media";
export const SOCIAL_POSTERS_SLUG = "social-posters";
export const SOCIAL_VIDEOS_SLUG = "social-videos";

const kindBySlug: Record<string, CategoryKind> = {
  news: "news",
  "state-jain-news": "news",
  "jain-milan": "news",
  "other-state-news": "news",
  panchakalyana: "news",
  mahamastakabhisheka: "news",
  "weekly-jain-news": "news",
  "jain-matha": "news",
  "jwalamala-programmes": "programme",
  "sadhakara-hejje": "programme",
  "hemmeya-shravakaru": "programme",
  "sahitigalondige-samvada": "programme",
  "jnana-deepike": "programme",
  "jnana-deevige": "programme",
  "dharmada-nudi": "programme",
  "jain-habbagalu": "programme",
  "jain-jeevana-shaili": "programme",
  "chintana-manthana": "programme",
  "kiru-parichaya": "programme",
  "kshetra-parichaya": "kshetra",
  "social-media": "listing",
  "social-posters": "listing",
  "social-videos": "listing",
  basadi: "kshetra",
};

export function isCategoryKind(value: string | undefined): value is CategoryKind {
  return !!value && (CATEGORY_KINDS as readonly string[]).includes(value);
}

/** Prefer the stored kind; fall back to slug so pages still work before the migration lands. */
export function categoryKind(category: {
  category_kind?: string | null;
  slug?: string;
}): CategoryKind {
  if (isCategoryKind(category.category_kind || "")) return category.category_kind as CategoryKind;
  return kindBySlug[category.slug || ""] || "listing";
}

export function usesEventDateFilter(kind: CategoryKind) {
  return kind === "news" || kind === "upcoming";
}

export function defaultListSort(kind: CategoryKind) {
  return usesEventDateFilter(kind) ? "event_date" : "newest";
}

export function categoryHref(slug: string) {
  return "/category/" + slug;
}

export function stateJainNewsDistrictHref(districtSlug: string) {
  return categoryHref(STATE_JAIN_NEWS_SLUG) + "/" + districtSlug;
}

export function mathaHref(mathaSlug: string) {
  return categoryHref(JAIN_MATHA_SLUG) + "/" + mathaSlug;
}

/** Menu-configured categories still resolve if the DB row has not been inserted yet. */
export function categoryFromNavigation(slug: string): Category | undefined {
  const item = mainNavigationCategories.find((row) => row.slug === slug);
  if (!item) return undefined;
  return {
    id: "nav-" + slug,
    slug,
    name_kn: item.name_kn,
    name_en: item.name_en,
    name_hi: item.name_hi,
    category_kind: kindBySlug[slug] || "listing",
    show_in_menu: true,
  };
}

export function resolvePublicCategory(
  slug: string,
  rows: Category[],
): Category | undefined {
  return rows.find((row) => row.slug === slug) || categoryFromNavigation(slug);
}
