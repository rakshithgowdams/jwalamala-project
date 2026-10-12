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
import { coverImageUrl, imageUrlFromPaste, isCoverImage, isHostedImage, parseImageLink, youtubeThumbnail } from "@/lib/utils/images";
import { indexPlaces, searchPlaces } from "@/lib/places/search";
import { databaseError, issueError, postErrors } from "@/lib/admin/post-errors";

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

describe("admin sign-up approval codes", () => {
  const account = { uid: "user-1", email: "new@example.com", name: "New Admin" };
  it("accepts only the emailed code and rejects tampered requests", async () => {
    process.env.ADMIN_OTP_SECRET = "test-secret";
    const { sealPending, openPending, codeMatches, newCode } = await import(
      "@/lib/auth/admin-signup"
    );
    const code = newCode();
    expect(code).toMatch(/^\d{6}$/);
    const sealed = sealPending(account, code);
    const pending = openPending(sealed)!;
    expect(pending).toMatchObject(account);
    expect(sealed).not.toContain(code);
    expect(codeMatches(pending, code)).toBe(true);
    expect(codeMatches(pending, code === "000000" ? "111111" : "000000")).toBe(false);
    expect(codeMatches(pending, "12345")).toBe(false);

    const [body, signature] = sealed.split(".");
    const forged = Buffer.from(
      JSON.stringify({ ...pending, uid: "someone-else" }),
    ).toString("base64url");
    expect(openPending(forged + "." + signature)).toBeNull();
    expect(openPending(body + "." + "0".repeat(64))).toBeNull();
    expect(openPending(undefined)).toBeNull();
  });
  it("expires codes after ten minutes and masks the approver inbox", async () => {
    process.env.ADMIN_OTP_SECRET = "test-secret";
    const { sealPending, openPending, maskEmail, approvalEmail } = await import(
      "@/lib/auth/admin-signup"
    );
    const pending = openPending(sealPending(account, "123456"))!;
    const minutes = (pending.exp - Date.now()) / 60000;
    expect(minutes).toBeGreaterThan(9.9);
    expect(minutes).toBeLessThanOrEqual(10);
    expect(approvalEmail()).toBe("jwalamala.developers@gmail.com");
    expect(maskEmail(approvalEmail())).toBe("jwa\u2022\u2022\u2022@gmail.com");
  });
});

describe("admin sign-up setup check", () => {
  const fakeKey = (ref: string, role: string) =>
    "eyJhbGciOiJIUzI1NiJ9." +
    Buffer.from(JSON.stringify({ ref, role })).toString("base64url") +
    ".signature";
  it("names keys copied from another Supabase project or the wrong role", async () => {
    const { signupSetupProblems } = await import("@/lib/auth/admin-signup");
    Object.assign(process.env, {
      NEXT_PUBLIC_SUPABASE_URL: "https://rightproject.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: fakeKey("otherproject", "anon"),
      SUPABASE_SERVICE_ROLE_KEY: fakeKey("otherproject", "service_role"),
      RESEND_API_KEY: "re_test",
    });
    expect(signupSetupProblems()).toEqual([
      "NEXT_PUBLIC_SUPABASE_ANON_KEY is from a different Supabase project than the URL",
      "SUPABASE_SERVICE_ROLE_KEY is from a different Supabase project than the URL",
    ]);
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = fakeKey("rightproject", "anon");
    process.env.SUPABASE_SERVICE_ROLE_KEY = fakeKey("rightproject", "anon");
    expect(signupSetupProblems()).toContain(
      "SUPABASE_SERVICE_ROLE_KEY is not the service_role key",
    );
    process.env.SUPABASE_SERVICE_ROLE_KEY = fakeKey("rightproject", "service_role");
    expect(signupSetupProblems()).toEqual([]);
    process.env.RESEND_API_KEY = "";
    expect(signupSetupProblems()).toEqual(["Add RESEND_API_KEY"]);
  });
});

describe("automatic article slugs", () => {
  it("transliterates Kannada titles into lowercase hyphenated slugs", async () => {
    const { slugify } = await import("@/lib/utils/slug");
    expect(slugify("ಶ್ರವಣಬೆಳಗೊಳ ಮಹಾಮಸ್ತಕಾಭಿಷೇಕ")).toBe("shravanabelagola-mahamastakabhisheka");
    expect(slugify("ಮೂಡುಬಿದಿರೆ ಸಾವಿರ ಕಂಬದ ಬಸದಿ")).toBe("mudubidire-savira-kambada-basadi");
    expect(slugify("ಪಂಚಕಲ್ಯಾಣ ಮಹೋತ್ಸವ ೨೦೨೬")).toBe("panchakalyana-mahotsava-2026");
    expect(slugify("Jain Milan: State Meet / 2026")).toBe("jain-milan-state-meet-2026");
    expect(slugify("  ---  ")).toBe("");
  });
});

describe("videos and images are links only", () => {
  it("reads YouTube and Facebook links and pasted <iframe> embed code", async () => {
    const { videoFromInput } = await import("@/lib/utils/video");
    const watch = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    expect(videoFromInput(watch)?.url).toBe(watch);
    expect(
      videoFromInput(
        '<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ?si=abc" title="YouTube video player" allowfullscreen></iframe>',
      ),
    ).toMatchObject({ provider: "youtube", id: "dQw4w9WgXcQ", url: watch });
    expect(
      videoFromInput('<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"></iframe>')?.id,
    ).toBe("dQw4w9WgXcQ");
    expect(
      videoFromInput(
        '<iframe src="https://www.facebook.com/plugins/video.php?height=314&amp;href=https%3A%2F%2Fwww.facebook.com%2Fjwalamala%2Fvideos%2F123456789%2F&amp;show_text=false"></iframe>',
      ),
    ).toMatchObject({ provider: "facebook", url: "https://www.facebook.com/jwalamala/videos/123456789/" });
  });
  it("keeps the video id in every Facebook link format", async () => {
    const { videoFromInput } = await import("@/lib/utils/video");
    const watch = "https://www.facebook.com/watch/?v=1234567890";
    for (const input of [
      "https://www.facebook.com/watch/?v=1234567890&ref=sharing",
      "https://m.facebook.com/watch?v=1234567890",
      "https://web.facebook.com/video.php?v=1234567890",
      '<iframe src="https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Fwatch%2F%3Fv%3D1234567890"></iframe>',
    ])
      expect(videoFromInput(input)).toMatchObject({ provider: "facebook", id: "1234567890", url: watch });
    expect(videoFromInput("https://www.facebook.com/reel/987654321?mibextid=abc")?.url).toBe(
      "https://www.facebook.com/reel/987654321/",
    );
    expect(videoFromInput("https://www.facebook.com/share/v/1AbCdEf/")?.url).toBe(
      "https://www.facebook.com/share/v/1AbCdEf/",
    );
    expect(videoFromInput("https://fb.watch/abc123/")?.url).toBe("https://fb.watch/abc123/");
    for (const input of ["https://www.facebook.com/", "https://www.facebook.com/watch/", "https://fb.watch/"])
      expect(videoFromInput(input)).toBeNull();
  });
  it("rejects other video hosts and scripts hidden in embed code", async () => {
    const { videoFromInput } = await import("@/lib/utils/video");
    for (const input of [
      '<iframe src="https://evil.example/embed/x"></iframe>',
      "javascript:alert(1)",
      "<script>alert(1)</script>",
      "",
    ])
      expect(videoFromInput(input)).toBeNull();
  });
  it("no longer accepts Supabase Storage image links", () => {
    expect(isHostedImage("https://abc.supabase.co/storage/v1/object/public/site-assets/a.webp")).toBe(false);
    expect(isHostedImage("https://ik.imagekit.io/jwalamala/a.webp")).toBe(true);
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
  it("accepts a cloud image file and rejects pages, http and private hosts", () => {
    expect(parseImageLink("https://cdn.example.com/photos/temple.jpg")?.src).toBe(
      "https://cdn.example.com/photos/temple.jpg",
    );
    expect(coverImageUrl("https://ik.imagekit.io/demo/Screenshot 2026.png")).toBe(
      "https://ik.imagekit.io/demo/Screenshot%202026.png",
    );
    expect(
      imageUrlFromPaste(
        '<meta charset="utf-8"><img src="https://i.ytimg.com/vi/fT1dWs99mz0/maxresdefault.jpg">',
        "",
      ),
    ).toBe("https://i.ytimg.com/vi/fT1dWs99mz0/maxresdefault.jpg");
    for (const value of [
      "https://example.com/not-a-picture",
      "http://ik.imagekit.io/jwalamala/photo.jpg",
      "https://127.0.0.1/secret.jpg",
      "![x](javascript:alert(1))",
    ])
      expect(parseImageLink(value)).toBeNull();
  });
  it("lets posts save ImageKit thumbnails and gallery images", () => {
    expect(isHostedImage(link)).toBe(true);
    expect(isHostedImage("https://ik.imagekit.io/jwalamala")).toBe(false);
  });
});

describe("YouTube thumbnails as cover images", () => {
  const hd = "https://i.ytimg.com/vi/fT1dWs99mz0/maxresdefault.jpg";
  it("stores any YouTube thumbnail or video link in one form", () => {
    for (const input of [
      "https://img.youtube.com/vi/fT1dWs99mz0/maxresdefault.jpg ",
      "https://i3.ytimg.com/vi/fT1dWs99mz0/maxresdefault.jpg",
      "https://i.ytimg.com/vi_webp/fT1dWs99mz0/maxresdefault.webp",
      "https://www.youtube.com/watch?v=fT1dWs99mz0&t=30s",
      "https://youtu.be/fT1dWs99mz0?si=abc",
      "https://www.youtube.com/shorts/fT1dWs99mz0",
    ])
      expect(youtubeThumbnail(input)).toBe(hd);
    expect(youtubeThumbnail("https://img.youtube.com/vi/fT1dWs99mz0/hqdefault.jpg")).toBe(
      "https://i.ytimg.com/vi/fT1dWs99mz0/hqdefault.jpg",
    );
    expect(isCoverImage(hd)).toBe(true);
    expect(isCoverImage("/images/jwalamala-logo.jpg")).toBe(true);
  });
  it("rejects look-alike hosts and odd paths", () => {
    for (const input of [
      "https://img.youtube.com.evil.test/vi/fT1dWs99mz0/maxresdefault.jpg",
      "https://img.youtube.com/vi/fT1dWs99mz0/../../x.jpg",
      "https://img.youtube.com/vi/short/maxresdefault.jpg",
      "https://example.com/vi/fT1dWs99mz0/maxresdefault.jpg",
    ])
      expect(youtubeThumbnail(input)).toBeNull();
    expect(isCoverImage("https://img.youtube.com/vi/fT1dWs99mz0/maxresdefault.jpg")).toBe(false);
  });
  it("converts YouTube links pasted as images inside the article", async () => {
    expect(parseImageLink("https://img.youtube.com/vi/fT1dWs99mz0/maxresdefault.jpg")?.src).toBe(hd);
    expect(parseImageLink("![Rayara pavadagalu](https://youtu.be/fT1dWs99mz0)")).toEqual({
      src: hd,
      alt: "Rayara pavadagalu",
    });
    const { cleanHtml } = await import("@/lib/utils/sanitize");
    expect(cleanHtml(`<p><img src="${hd}" alt="x"></p>`)).toContain(hd);
    expect(cleanHtml('<img src="https://cdn.example.com/photos/temple.jpg">')).toContain("temple.jpg");
    expect(cleanHtml('<img src="https://evil.example/not-a-picture">')).not.toContain("<img");
  });
});

describe("article save errors name the field to fix", () => {
  it("maps form checks to the field and a message in every language", () => {
    const bad = issueError({ path: ["video_url"], code: "custom" });
    expect(bad?.field).toBe("video_url");
    expect(bad?.message.en).toMatch(/^Video:/);
    expect(bad?.message.kn).toMatch(/^ವಿಡಿಯೋ:/);
    expect(bad?.message.hi).toMatch(/^वीडियो:/);
    expect(issueError({ path: ["title_kn"], code: "too_small" })?.message.en).toMatch(/at least 3/);
    expect(issueError({ path: ["title_kn"], code: "too_big" })).toBe(postErrors.titleTooLong);
    expect(issueError({ path: ["body_json"], code: "too_big" })?.field).toBe("body_html");
    expect(issueError({ path: ["primary_category"], code: "invalid_format" })?.field).toBe("primary_category");
    expect(issueError({ path: ["unknown_field"], code: "custom" })).toBeNull();
  });
  it("explains the database's publishing rules", () => {
    expect(databaseError({ code: "23505", message: 'duplicate key value violates unique constraint "posts_slug_key"' })).toBe(
      postErrors.slugTaken,
    );
    expect(databaseError({ code: "P0001", message: "Embargo has not ended" })).toBe(postErrors.embargo);
    expect(databaseError({ code: "P0001", message: "Post is locked by another editor" })).toBe(postErrors.locked);
    expect(databaseError({ code: "P0001", message: "Advertiser must approve this version before publication" })).toBe(
      postErrors.sponsorApproval,
    );
    expect(databaseError({ code: "XX000", message: "something else" })).toBeNull();
  });
});

describe("place search", () => {
  const index = indexPlaces([
    { id: "d-udupi", name_kn: "ಉಡುಪಿ", name_en: "Udupi", district: "ಉಡುಪಿ", is_district: true },
    { id: "d-shivamogga", name_kn: "ಶಿವಮೊಗ್ಗ", name_en: "Shivamogga", district: "ಶಿವಮೊಗ್ಗ", is_district: true },
    { id: "udupi-city", name_kn: "ಉಡುಪಿ", name_en: "Udupi", district: "ಉಡುಪಿ" },
    { id: "karkala", name_kn: "ಕಾರ್ಕಳ", name_en: "Karkala", district: "ಉಡುಪಿ" },
    { id: "sagar", name_kn: "ಸಾಗರ", name_en: "Sagar", district: "ಶಿವಮೊಗ್ಗ" },
    { id: "mangaluru", name_kn: "ಮಂಗಳೂರು", name_en: "Mangaluru", district: "ದಕ್ಷಿಣ ಕನ್ನಡ" },
  ]);
  const ids = (query: string) => searchPlaces(index, query).map((p) => p.id);
  it("finds places by Kannada or English name", () => {
    expect(ids("ಕಾರ್ಕ")).toEqual(["karkala"]);
    expect(ids("KARK")).toEqual(["karkala"]);
  });
  it("tolerates common alternate English spellings", () => {
    expect(ids("mangalooru")).toEqual(["mangaluru"]);
    expect(ids("shivamoga")).toContain("d-shivamogga");
  });
  it("finds places by their former English names", () => {
    expect(ids("Mangalore")).toEqual(["mangaluru"]);
    expect(ids("shimoga")[0]).toBe("d-shivamogga");
  });
  it("lists the district first, then its towns", () => {
    expect(ids("udupi")).toEqual(["d-udupi", "udupi-city", "karkala"]);
    expect(ids("ಶಿವಮೊಗ್ಗ")).toEqual(["d-shivamogga", "sagar"]);
  });
  it("shows the whole list for an empty query", () => {
    expect(ids("  ")).toHaveLength(6);
  });
});
