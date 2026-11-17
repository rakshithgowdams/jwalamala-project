import { describe, expect, it } from "vitest";
import {
  ARTICLE_PLACEMENTS,
  ARTICLE_PLACEMENT_GROUPS,
  placementGroupsFor,
} from "@/lib/admin/article-placements";
import { mainNavigation } from "@/config/navigation";
import type { Category } from "@/lib/types";

const PROGRAMME_SHOWS = [
  "sadhakara-hejje",
  "hemmeya-shravakaru",
  "sahitigalondige-samvada",
  "kiru-parichaya",
  "jnana-deepike",
  "jnana-deevige",
  "dharmada-nudi",
  "weekly-jain-news",
  "jain-habbagalu",
  "jain-jeevana-shaili",
  "chintana-manthana",
];

describe("article placements", () => {
  it("offers every category the public menu links to", () => {
    const menuSlugs = mainNavigation.flatMap((section) => [
      section.href,
      ...(Array.isArray(section.children) ? section.children.map((c) => c.href) : []),
    ])
      .filter((href) => href.startsWith("/category/"))
      .map((href) => href.slice("/category/".length));
    const offered = new Set(ARTICLE_PLACEMENTS.map((row) => row.slug));
    for (const slug of menuSlugs) expect(offered).toContain(slug);
  });

  it("files every Jwalamala programme show under the programmes group", () => {
    const group = ARTICLE_PLACEMENT_GROUPS.find((g) => g.key === "programmes");
    expect(group?.options[0]).toMatchObject({ slug: "jwalamala-programmes", parent: null });
    const shows = group?.options.filter((o) => o.parent === "jwalamala-programmes").map((o) => o.slug);
    expect(shows).toEqual(PROGRAMME_SHOWS);
  });

  it("keeps social posters and videos under social media", () => {
    const group = ARTICLE_PLACEMENT_GROUPS.find((g) => g.key === "social");
    expect(group?.options.map((o) => o.slug)).toEqual([
      "social-media",
      "social-posters",
      "social-videos",
    ]);
  });

  it("maps the districts menu to the kshetra category and asks for a place", () => {
    const row = ARTICLE_PLACEMENTS.find((o) => o.slug === "kshetra-parichaya");
    expect(row?.needsPlace).toBe(true);
    expect(ARTICLE_PLACEMENTS.find((o) => o.slug === "jain-matha")?.needsMatha).toBe(true);
  });

  it("adds programme shows created in the database under their parent", () => {
    const categories: Category[] = [
      { id: "p", slug: "jwalamala-programmes", name_kn: "ಕಾರ್ಯಕ್ರಮ", name_en: "Programmes" },
      { id: "n", slug: "new-show", name_kn: "ಹೊಸ ಕಾರ್ಯಕ್ರಮ", name_en: "", parent_id: "p" },
    ];
    const group = placementGroupsFor(categories).find((g) => g.key === "programmes");
    expect(group?.options.at(-1)).toMatchObject({
      slug: "new-show",
      parent: "jwalamala-programmes",
      label: { kn: "ಹೊಸ ಕಾರ್ಯಕ್ರಮ", en: "ಹೊಸ ಕಾರ್ಯಕ್ರಮ" },
    });
  });
});
