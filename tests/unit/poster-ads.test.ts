import { describe, expect, it } from "vitest";
import {
  groupsForPages,
  pagesForGroups,
  posterRow,
  posterSchema,
  posterState,
  slotShape,
} from "@/lib/ads/posters";

const valid = {
  advertiser: "Padmavati Cotton House",
  shape: "landscape",
  image_url:
    "https://abc.supabase.co/storage/v1/object/public/site-assets/u/poster.webp",
  target_url: "",
  alt_kn: "ಹಬ್ಬದ ಹೊಸ ಸಂಗ್ರಹ",
  pages: ["home", "news"],
  device: "all",
  starts_at: "2026-10-01T09:00",
  ends_at: "2026-10-31T21:00",
  is_active: true,
  priority: "0",
};

describe("poster and banner ads", () => {
  it("fits 16:9 in wide spaces, 1:1 in sidebars and never in the sticky strip", () => {
    expect(slotShape("home_top_leaderboard", "banner")).toBe("landscape");
    expect(slotShape("article_sidebar_top", "rectangle")).toBe("square");
    expect(slotShape("global_mobile_sticky", "banner")).toBe("strip");
  });

  it("turns page choices into the page types the picker matches", () => {
    expect(pagesForGroups(["home", "videos"])).toEqual([
      "home",
      "video",
      "videos",
      "shorts",
      "live",
    ]);
    expect(pagesForGroups([])).toEqual([]);
    expect(groupsForPages(pagesForGroups(["districts", "events"]))).toEqual([
      "districts",
      "events",
    ]);
  });

  it("stores entered India times as instants and fills every fitting space", () => {
    const parsed = posterSchema.parse(valid);
    expect(parsed.starts_at).toBe("2026-10-01T03:30:00.000Z");
    expect(parsed.target_url).toBeNull();
    const row = posterRow(parsed);
    expect(row.slot_keys).toEqual([]);
    expect(row.target_pages).toEqual(["home", "news", "archive"]);
    expect(row.slot).toBe("home_banner");
    expect(
      posterRow(posterSchema.parse({ ...valid, shape: "square" })).slot,
    ).toBe("sidebar");
  });

  it("rejects end dates before the start, insecure links and outside images", () => {
    for (const change of [
      { ends_at: "2026-09-30T09:00" },
      { target_url: "http://shop.example.com" },
      { image_url: "https://elsewhere.example/poster.png" },
      { shape: "wide" },
      { pages: ["nowhere"] },
    ])
      expect(posterSchema.safeParse({ ...valid, ...change }).success).toBe(
        false,
      );
  });

  it("switches itself on at the start and off after the end", () => {
    const row = {
      is_active: true,
      starts_at: "2026-10-01T03:30:00Z",
      ends_at: "2026-10-31T15:30:00Z",
    };
    expect(posterState(row, Date.parse("2026-09-30T00:00:00Z"))).toBe(
      "scheduled",
    );
    expect(posterState(row, Date.parse("2026-10-15T00:00:00Z"))).toBe("live");
    expect(posterState(row, Date.parse("2026-10-31T15:30:00Z"))).toBe(
      "expired",
    );
    expect(
      posterState(
        { ...row, is_active: false },
        Date.parse("2026-10-15T00:00:00Z"),
      ),
    ).toBe("off");
  });
});
