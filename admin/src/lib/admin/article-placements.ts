import type { Tri } from "@/lib/i18n/strings";
import type { Category } from "@/lib/types";
import { mainNavigation } from "@/config/navigation";

export type PlacementOption = {
  slug: string;
  label: Tri;
  /** Slug of the menu parent this option is filed under, if any. */
  parent: string | null;
  needsPlace?: boolean;
  needsMatha?: boolean;
};

export type PlacementGroup = {
  key: string;
  label: Tri;
  options: PlacementOption[];
};

const CATEGORY_PREFIX = "/category/";
const PLACE_SLUGS = new Set(["state-jain-news", "kshetra-parichaya"]);
const MATHA_SLUGS = new Set(["jain-matha"]);

/** Menu sections whose href is not a category but whose stories live in one. */
const SECTION_CATEGORY: Record<string, string> = {
  districts: "kshetra-parichaya",
};

const slugOf = (href: string) =>
  href.startsWith(CATEGORY_PREFIX) ? href.slice(CATEGORY_PREFIX.length) : null;

const tri = (label: { kn: string; en: string; hi: string }): Tri => ({
  kn: label.kn,
  en: label.en,
  hi: label.hi,
});

function option(slug: string, label: Tri, parent: string | null): PlacementOption {
  return {
    slug,
    label,
    parent,
    needsPlace: PLACE_SLUGS.has(slug),
    needsMatha: MATHA_SLUGS.has(slug),
  };
}

/** Every category the public main menu lists, grouped and ordered like the menu. */
export const ARTICLE_PLACEMENT_GROUPS: PlacementGroup[] = mainNavigation
  .map((section): PlacementGroup => {
    const own = slugOf(section.href) || SECTION_CATEGORY[section.key] || null;
    const options: PlacementOption[] = own ? [option(own, tri(section), null)] : [];
    if (Array.isArray(section.children)) {
      for (const child of section.children) {
        const slug = slugOf(child.href);
        if (slug) options.push(option(slug, tri(child), own));
      }
    }
    return { key: section.key, label: tri(section), options };
  })
  .filter((group) => group.options.length);

export const ARTICLE_PLACEMENTS: PlacementOption[] = ARTICLE_PLACEMENT_GROUPS.flatMap(
  (group) => group.options,
);

/**
 * Menu groups plus any child category an editor added in the database under a
 * menu parent (for example a new Jwalamala programme), so new shows appear
 * without a code change.
 */
export function placementGroupsFor(categories: Category[]): PlacementGroup[] {
  const known = new Set(ARTICLE_PLACEMENTS.map((row) => row.slug));
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  return ARTICLE_PLACEMENT_GROUPS.map((group) => {
    const parentSlug = group.options.find((row) => row.parent === null)?.slug;
    const parentId = parentSlug ? bySlug.get(parentSlug)?.id : undefined;
    if (!parentId) return group;
    const extras = categories
      .filter((c) => c.parent_id === parentId && !known.has(c.slug))
      .map((c) =>
        option(
          c.slug,
          { kn: c.name_kn, en: c.name_en || c.name_kn, hi: c.name_hi || c.name_kn },
          parentSlug!,
        ),
      );
    return extras.length ? { ...group, options: [...group.options, ...extras] } : group;
  });
}
