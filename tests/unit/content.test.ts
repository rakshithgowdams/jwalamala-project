import { describe, it, expect } from "vitest";
import { demoPosts } from "@/lib/data/demo";
import { filterPosts, searchTerms } from "@/lib/utils/search";
import { normalizeVideo } from "@/lib/utils/video";
import { formatDate, safeReturnPath } from "@/lib/utils/dates";
import { cleanHtml } from "@/lib/utils/sanitize";
import { submissionSchema } from "@/lib/validation/submission";
describe("Kannada search and event dates", () => {
  it("finds Kannada titles from Latin spelling", () =>
    expect(
      filterPosts(demoPosts, { q: "shravanabelagola" }).some((p) =>
        p.title_kn.includes("ಶ್ರವಣಬೆಳಗೊಳ"),
      ),
    ).toBe(true));
  it("finds Kannada queries and spelling aliases", () => {
    expect(searchTerms("shravana")).toContain("ಶ್ರವಣಬೆಳಗೊಳ");
    expect(filterPosts(demoPosts, { q: "ಶ್ರವಣಬೆಳಗೊಳ" }).length).toBeGreaterThan(
      0,
    );
  });
  it("filters on event date independently from publication", () => {
    const results = filterPosts(demoPosts, {
      mode: "event_date",
      from: "2026-09-14",
      to: "2026-09-14",
    });
    expect(results).toHaveLength(2);
    expect(results[0].published_at.slice(0, 10)).not.toBe("2026-09-14");
  });
  it("combines category and query", () =>
    expect(
      filterPosts(demoPosts, { q: "shravanabelagola", category: "education" }),
    ).toHaveLength(0));
  it("returns no results for an inverted range", () =>
    expect(
      filterPosts(demoPosts, { from: "2026-10-01", to: "2026-09-01" }),
    ).toHaveLength(0));
  it("formats Kannada months with Western digits", () =>
    expect(formatDate("2026-09-14")).toBe("14 ಸೆಪ್ಟೆಂಬರ್ 2026"));
});
describe("input security", () => {
  it("removes scripts and event handlers", () => {
    const value = cleanHtml(
      '<p onclick="alert(1)">hello</p><script>alert(2)</script><a href="javascript:alert(3)">bad</a>',
    );
    expect(value).not.toMatch(/script|onclick/);
    expect(value).toContain("hello");
  });
  it("blocks external login return URLs", () => {
    expect(safeReturnPath("//evil.test")).toBe("/account");
    expect(safeReturnPath("/\\evil.test")).toBe("/account");
    expect(safeReturnPath("/news/story")).toBe("/news/story");
  });
  it("normalizes video URL variants and ignores tracking", () => {
    expect(normalizeVideo("https://youtu.be/abcdefghijk?si=123")?.url).toBe(
      "https://www.youtube.com/watch?v=abcdefghijk",
    );
    expect(
      normalizeVideo("https://www.youtube.com/shorts/abcdefghijk")?.id,
    ).toBe("abcdefghijk");
    expect(
      normalizeVideo("https://youtube.com.evil.test/watch?v=abcdefghijk"),
    ).toBeNull();
  });
  it("rejects incomplete and oversized submissions", () => {
    expect(submissionSchema.safeParse({}).success).toBe(false);
    expect(
      submissionSchema.safeParse({
        name: "AB",
        phone: "+919876543210",
        town: "AB",
        event_date: "2026-09-14",
        email: "",
        link: "",
        message: "x".repeat(5001),
        token: "valid",
      }).success,
    ).toBe(false);
  });
});
