import { describe, it, expect } from "vitest";
import {
  roleControlSchema,
  providerControlSchema,
} from "@/lib/v4/control-schema";
import { publicationIssues } from "@/lib/v4/workflow";
import { parseUtilityRow } from "@/lib/v4/utility-import";
import { chapterTextSchema } from "@/lib/v4/chapters";
import {
  parseCsv,
  mapImportRow,
  importRowSchema,
  textToHtml,
} from "@/lib/v4/import";
import { v4Schemas, v4Resources } from "@/lib/v4/admin-schema";
import { isHostedImage, parseImageLink } from "@/lib/utils/images";

describe("newsroom controls", () => {
  it("limits role and provider settings", () => {
    expect(
      roleControlSchema.safeParse({
        role: "reader",
        permission: "service_role",
        allowed: true,
      }).success,
    ).toBe(false);
    expect(
      providerControlSchema.safeParse({
        id: "ai",
        enabled: true,
        monthly_limit: -1,
      }).success,
    ).toBe(false);
  });
  it("checks publication metadata and embargo", () => {
    expect(
      publicationIssues(
        {
          title_kn: "title",
          summary_kn: "",
          event_date: "",
          image_credit: "",
          embargo_until: "2027-01-01T00:00:00Z",
        },
        Date.parse("2026-09-16"),
      ),
    ).toEqual(["summary", "event_date", "credit", "embargo"]);
  });
});

describe("imports", () => {
  it("validates source and units on utility imports", () => {
    const row = {
      rate_date: "2026-09-16",
      kind: "gold22",
      value: "100",
      unit: "INR/g",
      source: "Verified source",
    };
    expect(parseUtilityRow("market_rates", row).success).toBe(true);
    expect(
      parseUtilityRow("market_rates", { ...row, value: "-1" }).success,
    ).toBe(false);
    expect(parseUtilityRow("market_rates", { ...row, source: "" }).success).toBe(
      false,
    );
  });
  it("parses Kannada timestamp chapters and rejects invalid seconds", () => {
    expect(chapterTextSchema.parse("01:05 ಪರಿಚಯ")).toEqual([
      { seconds: 65, label_kn: "ಪರಿಚಯ" },
    ]);
    expect(chapterTextSchema.safeParse("01:65 Invalid").success).toBe(false);
  });
});

describe("CSV draft import", () => {
  it("handles BOM, quoted commas, doubled quotes and multiline fields", () => {
    expect(
      parseCsv('\uFEFFtitle,body\r\n"Hello, world","First\n""quoted"""'),
    ).toEqual([{ title: "Hello, world", body: 'First\n"quoted"' }]);
  });
  it("rejects malformed quoting, duplicate headers and ragged rows", () => {
    for (const csv of ["a,a\n1,2", "a,b\n1", 'a\n"unterminated', 'a\n"ok"bad'])
      expect(() => parseCsv(csv)).toThrow();
  });
  it("requires real dates and slugs, escapes imported body text", () => {
    expect(
      importRowSchema.safeParse(
        mapImportRow({ Title: "Story" }, { title_kn: "Title" }),
      ).success,
    ).toBe(false);
    expect(textToHtml("<script>alert(1)</script>")).toBe(
      "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>",
    );
  });
});

describe("editor schemas", () => {
  it("accepts translated market rate units and offers them in the editor", () => {
    const parsed = v4Schemas.market_rates.safeParse({
      rate_date: "2026-09-18",
      kind: "petrol",
      place_id: "",
      value: 102.5,
      unit: "ಲೀಟರ್",
      unit_en: "litre",
      unit_hi: "लीटर",
      source: "ಮೂಲ",
      source_en: "Source",
      source_hi: "स्रोत",
      is_seed: false,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success)
      expect(parsed.data).toMatchObject({ unit_en: "litre", unit_hi: "लीटर" });
    const names = v4Resources.market_rates.fields.map((f) => f.name);
    expect(names).toContain("unit_en");
    expect(names).toContain("unit_hi");
  });

  it("lets the editor save district ordering, visibility and a description", () => {
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

  it("will not let staff approve a business ad without an end date", () => {
    const row = {
      status: "approved",
      payment_status: "paid",
      amount: "1500",
      payment_ref: "UPI-123",
      slug: "padmavati",
      name_kn: "ಪದ್ಮಾವತಿ",
      category: "textiles",
      image_url: "",
      phone: "",
      whatsapp: "",
      website: "",
      place_id: "",
      target_places: "[]",
      starts_at: "2026-10-01T10:00",
      ends_at: "",
      priority: "0",
      weight: "1",
      requested_formats: "[]",
      is_seed: false,
    };
    expect(v4Schemas.business_ads.safeParse(row).success).toBe(false);
    const ok = v4Schemas.business_ads.safeParse({
      ...row,
      ends_at: "2026-11-01T10:00",
    });
    expect(ok.success).toBe(true);
    if (ok.success)
      expect(ok.data).toMatchObject({ amount: 1500, website: null });
  });
});

describe("linked article images", () => {
  const link = "https://ik.imagekit.io/jwalamala/news/temple.jpg?tr=w-1200";
  it("accepts a bare ImageKit link or a Markdown image", () => {
    expect(parseImageLink("  " + link + " ")).toEqual({ src: link, alt: "" });
    expect(parseImageLink(`![Temple at dawn](${link} "Title")`)).toEqual({
      src: link,
      alt: "Temple at dawn",
    });
    expect(parseImageLink("/images/hill.webp")?.src).toBe("/images/hill.webp");
  });
  it("rejects other hosts, plain http and look-alike domains", () => {
    for (const value of [
      "https://example.com/photo.jpg",
      "http://ik.imagekit.io/jwalamala/photo.jpg",
      "https://ik.imagekit.io.evil.example/x/photo.jpg",
      "![x](javascript:alert(1))",
    ])
      expect(parseImageLink(value)).toBeNull();
  });
  it("lets posts save ImageKit thumbnails and gallery images", () => {
    expect(isHostedImage(link)).toBe(true);
    expect(isHostedImage("https://ik.imagekit.io/jwalamala")).toBe(false);
  });
});
