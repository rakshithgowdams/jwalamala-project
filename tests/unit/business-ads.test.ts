import { describe, expect, it } from "vitest";
import {
  businessAdApplicationSchema,
  businessAdState,
  dialDigits,
  pickBusinessAds,
  telHref,
  whatsappHref,
  type BusinessAdView,
} from "@/lib/ads/business";
import { canonicalSlot, routeAllowsAds, slotKeys } from "@/lib/ads/schema";

const ad = (
  id: string,
  extra: Partial<BusinessAdView> = {},
): BusinessAdView => ({
  id,
  slug: id,
  name_kn: id,
  name_en: "",
  name_hi: "",
  category: "other",
  offer_kn: "",
  offer_en: "",
  offer_hi: "",
  image_url: null,
  phone: "",
  whatsapp: "",
  website: null,
  address_kn: "",
  place_id: null,
  target_places: [],
  ends_at: "2026-12-31T00:00:00Z",
  priority: 0,
  weight: 1,
  ...extra,
});

describe("local shop ads", () => {
  const ads = [
    ad("statewide"),
    ad("hassan-only", { target_places: ["hassan"], district: "ಹಾಸನ" }),
    ad("udupi-only", { target_places: ["udupi"] }),
    ad("hassan-shop", { district: "ಹಾಸನ" }),
  ];

  it("keeps district-targeted ads off the statewide home page", () => {
    const ids = pickBusinessAds(ads, { count: 10 }).map((a) => a.id);
    expect(ids).toEqual(expect.arrayContaining(["statewide", "hassan-shop"]));
    expect(ids).not.toContain("hassan-only");
    expect(ids).not.toContain("udupi-only");
  });

  it("shows a district its own targeted ads, local shops first", () => {
    const ids = pickBusinessAds(ads, {
      districtId: "hassan",
      district: "ಹಾಸನ",
      count: 10,
      random: () => 0.5,
    }).map((a) => a.id);
    expect(ids).not.toContain("udupi-only");
    expect(ids.slice(0, 2).sort()).toEqual(["hassan-only", "hassan-shop"]);
    expect(ids.at(-1)).toBe("statewide");
  });

  it("lets editor priority outrank locality", () => {
    const ids = pickBusinessAds([...ads, ad("paid-top", { priority: 5 })], {
      districtId: "hassan",
      district: "ಹಾಸನ",
      count: 1,
    }).map((a) => a.id);
    expect(ids).toEqual(["paid-top"]);
  });

  it("builds dialler and WhatsApp links for Indian numbers", () => {
    expect(dialDigits("98450 12345")).toBe("919845012345");
    expect(telHref("+91 98450-12345")).toBe("tel:+919845012345");
    expect(whatsappHref("9845012345")).toBe("https://wa.me/919845012345");
    expect(telHref("")).toBe("");
  });

  it("explains why an ad is or is not running", () => {
    const now = Date.parse("2026-10-01T12:00:00Z");
    const base = {
      status: "approved",
      payment_status: "paid",
      starts_at: "2026-09-01T00:00:00Z",
      ends_at: "2026-11-01T00:00:00Z",
    };
    expect(businessAdState(base, now)).toBe("live");
    expect(businessAdState({ ...base, payment_status: "unpaid" }, now)).toBe(
      "unpaid",
    );
    expect(businessAdState({ ...base, payment_status: "waived" }, now)).toBe(
      "live",
    );
    expect(businessAdState({ ...base, status: "pending" }, now)).toBe(
      "pending",
    );
    expect(
      businessAdState({ ...base, ends_at: "2026-09-30T00:00:00Z" }, now),
    ).toBe("expired");
    expect(
      businessAdState({ ...base, starts_at: "2026-10-05T00:00:00Z" }, now),
    ).toBe("scheduled");
  });
});

describe("advertising application", () => {
  const valid = {
    name_kn: "ಪದ್ಮಾವತಿ ಜವಳಿ",
    category: "textiles",
    district_id: "6f1f7b9e-3f4a-4c3b-9a43-8a5b0f9e2a11",
    town: "ಹಾಸನ",
    offer_kn: "ಹಬ್ಬದ ಹೊಸ ಸಂಗ್ರಹ",
    phone: "98450 12345",
    whatsapp: "",
    website: "",
    contact_name: "ರಮೇಶ್",
    contact_email: "owner@example.com",
    formats: ["shop_card"],
    duration: "month",
    start_date: "2026-10-10",
    message: "",
    policy: true,
    token: "captcha-token",
    website_url: "",
  };

  it("accepts a complete application", () => {
    expect(businessAdApplicationSchema.safeParse(valid).success).toBe(true);
  });

  it("requires consent to the rules, a phone number and https links", () => {
    for (const change of [
      { policy: false },
      { phone: "" },
      { website: "http://shop.example.com" },
      { formats: [] },
      { offer_kn: "x".repeat(161) },
    ])
      expect(
        businessAdApplicationSchema.safeParse({ ...valid, ...change }).success,
      ).toBe(false);
  });

  it("rejects a form a bot filled in", () => {
    expect(
      businessAdApplicationSchema.safeParse({
        ...valid,
        website_url: "https://spam.example",
      }).success,
    ).toBe(false);
  });
});

describe("Google and banner slots", () => {
  it("gives district pages their own slots", () => {
    expect(slotKeys).toEqual(
      expect.arrayContaining([
        "district_top",
        "district_sidebar",
        "district_bottom",
      ]),
    );
    expect(canonicalSlot("district-top")).toBe("district_top");
    expect(canonicalSlot("districts-sidebar")).toBe("district_sidebar");
    expect(canonicalSlot("district-bottom")).toBe("district_bottom");
    expect(canonicalSlot("category-sidebar")).toBe("category_sidebar");
  });

  it("serves ads on district pages but not on ad-only or form pages", () => {
    expect(routeAllowsAds("/districts")).toBe(true);
    expect(routeAllowsAds("/districts/hassan")).toBe(true);
    expect(routeAllowsAds("/local-shops")).toBe(false);
    expect(routeAllowsAds("/advertise")).toBe(false);
    expect(routeAllowsAds("/notices/submit")).toBe(false);
  });
});
