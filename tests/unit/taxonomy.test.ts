import { describe, expect, it } from "vitest";
import {
  KIRU_PARICHAYA_SLUG,
  JWALAMALA_PROGRAMMES_SLUG,
  SOCIAL_MEDIA_SLUG,
  SOCIAL_POSTERS_SLUG,
  SOCIAL_VIDEOS_SLUG,
  categoryKind,
  defaultListSort,
  mathaHref,
  resolvePublicCategory,
  stateJainNewsDistrictHref,
  usesEventDateFilter,
} from "@/lib/taxonomy";
import { mainNavigationCategories } from "@/config/navigation";
import { districtsWithContent } from "@/lib/utils/districts";
import { listActiveMathas } from "@/lib/utils/mathas";
import { v4Demo } from "@/lib/v4/demo";

describe("taxonomy kinds", () => {
  it("keeps stored kind and falls back by slug", () => {
    expect(categoryKind({ slug: "state-jain-news" })).toBe("news");
    expect(categoryKind({ slug: "kshetra-parichaya" })).toBe("kshetra");
    expect(
      categoryKind({ slug: "state-jain-news", category_kind: "programme" }),
    ).toBe("programme");
  });

  it("hides event-date filters on kshetra pages", () => {
    expect(usesEventDateFilter("kshetra")).toBe(false);
    expect(usesEventDateFilter("news")).toBe(true);
    expect(defaultListSort("news")).toBe("event_date");
    expect(defaultListSort("kshetra")).toBe("newest");
  });

  it("files kiru parichaya under the channel programmes dropdown", () => {
    const kiru = mainNavigationCategories.find(
      (row) => row.slug === KIRU_PARICHAYA_SLUG,
    );
    expect(kiru?.parent).toBe(JWALAMALA_PROGRAMMES_SLUG);
    expect(
      resolvePublicCategory(KIRU_PARICHAYA_SLUG, [])?.name_kn,
    ).toContain("ಕಿರು ಪರಿಚಯ");
  });

  it("files social posters and videos under social media", () => {
    expect(
      mainNavigationCategories.find((row) => row.slug === SOCIAL_POSTERS_SLUG)?.parent,
    ).toBe(SOCIAL_MEDIA_SLUG);
    expect(
      mainNavigationCategories.find((row) => row.slug === SOCIAL_VIDEOS_SLUG)?.parent,
    ).toBe(SOCIAL_MEDIA_SLUG);
    expect(resolvePublicCategory(SOCIAL_MEDIA_SLUG, [])?.name_kn).toBe(
      "ಸಾಮಾಜಿಕ ಜಾಲತಾಣ",
    );
  });

  it("builds nested public URLs without replacing existing category paths", () => {
    expect(stateJainNewsDistrictHref("kalaburagi")).toBe(
      "/category/state-jain-news/kalaburagi",
    );
    expect(mathaHref("shravanabelagola-matha")).toBe(
      "/category/jain-matha/shravanabelagola-matha",
    );
  });
});

describe("menu sources", () => {
  it("lists only active mathas from the table", () => {
    const names = listActiveMathas(v4Demo.mathas, "kn").map(
      (matha) => matha.slug,
    );
    expect(names).toEqual([
      "shravanabelagola-matha",
      "hombuja-matha",
      "swadi-matha",
    ]);
  });

  it("falls back to every district when no posts have a place", () => {
    const listed = districtsWithContent(v4Demo.places, [], "kn");
    expect(listed.length).toBeGreaterThan(0);
    expect(listed.every((place) => place.is_district)).toBe(true);
  });
});
