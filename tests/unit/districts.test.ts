import { describe, expect, it } from "vitest";
import {
  listDistricts,
  postsInDistrict,
  townsInDistrict,
} from "@/lib/utils/districts";
import { v4Demo } from "@/lib/v4/demo";
import { demoPosts } from "@/lib/data/demo";
import { v4Resources, v4Schemas } from "@/lib/v4/admin-schema";
import type { Place } from "@/lib/v4/types";

const places = v4Demo.places;
const bySlug = (slug: string) => places.find((p) => p.slug === slug)!;

describe("district-wise news", () => {
  it("lists every Karnataka district once, and never a town", () => {
    const districts = listDistricts(places, "en");
    expect(districts).toHaveLength(31);
    expect(districts.every((d) => d.is_district)).toBe(true);
    expect(districts.map((d) => d.slug)).not.toContain("shravanabelagola");
  });

  it("follows the editor's order before falling back to the reader's alphabet", () => {
    const ordered: Place[] = places.map((p) =>
      p.slug === "yadgir"
        ? { ...p, sort_order: -10 }
        : p.slug === "bagalkote"
          ? { ...p, sort_order: 10 }
          : p,
    );
    const slugs = listDistricts(ordered, "en").map((d) => d.slug);
    expect(slugs[0]).toBe("yadgir");
    expect(slugs.at(-1)).toBe("bagalkote");
    expect(slugs[1]).toBe("ballari");
  });

  it("leaves out districts an editor has hidden unless asked", () => {
    const hidden = places.map((p) =>
      p.slug === "kodagu" ? { ...p, show_in_district_news: false } : p,
    );
    expect(listDistricts(hidden, "kn").map((d) => d.slug)).not.toContain(
      "kodagu",
    );
    expect(
      listDistricts(hidden, "kn", { includeHidden: true }).map((d) => d.slug),
    ).toContain("kodagu");
  });

  it("counts a town's news toward its district", () => {
    const hassan = postsInDistrict(demoPosts, places, bySlug("hassan"));
    expect(hassan.some((p) => p.event_place === "ಶ್ರವಣಬೆಳಗೊಳ")).toBe(true);
    expect(hassan.every((p) => p.event_place !== "ಮೂಡುಬಿದಿರೆ")).toBe(true);
    expect(
      townsInDistrict(places, bySlug("dakshina-kannada")).map((p) => p.slug),
    ).toEqual(expect.arrayContaining(["moodbidri", "dharmastala"]));
  });

  it("lets the editor save ordering, visibility and a description", () => {
    const parsed = v4Schemas.places.safeParse({
      slug: "hassan",
      state: "Karnataka",
      name_kn: "ಹಾಸನ",
      name_en: "Hassan",
      name_hi: "हासन",
      district: "ಹಾಸನ",
      lat: "",
      lng: "",
      is_district: true,
      show_in_weather: false,
      show_in_district_news: true,
      sort_order: "20",
      cover_url: "",
      description_kn: "ಹಾಸನ ಜಿಲ್ಲೆಯ ಸುದ್ದಿ",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success)
      expect(parsed.data).toMatchObject({
        sort_order: 20,
        cover_url: null,
        description_en: "",
      });
    const names = v4Resources.places.fields.map((f) => f.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "show_in_district_news",
        "sort_order",
        "description_kn",
      ]),
    );
  });
});
