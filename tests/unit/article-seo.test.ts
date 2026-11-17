import { describe, expect, it } from "vitest";
import { articleDescription, articleExcerpt, articleKeywords } from "@/lib/seo/article-meta";

describe("article search metadata", () => {
  it("builds a description from the summary, then the body", () => {
    expect(articleExcerpt("  A short summary.  ")).toBe("A short summary.");
    expect(articleExcerpt("<p>Temple&nbsp;news</p><p>continues here.</p>")).toBe(
      "Temple news continues here.",
    );
    const long = "word ".repeat(80);
    expect(articleExcerpt(long).endsWith("…")).toBe(true);
    expect(articleExcerpt(long).length).toBeLessThanOrEqual(160);
  });

  it("ignores a stub SEO description and uses the article summary", () => {
    expect(articleDescription("test", "ಶ್ರವಣಬೆಳಗೊಳದ ನವರಾತ್ರಿ ವಿವರ.", "", "ಶೀರ್ಷಿಕೆ")).toBe(
      "ಶ್ರವಣಬೆಳಗೊಳದ ನವರಾತ್ರಿ ವಿವರ.",
    );
    const written = "A full search description written by the editor for this story.";
    expect(articleDescription(written, "summary", "", "title")).toBe(written);
  });

  it("keeps editor keywords and fills the rest from tags and place", () => {
    expect(
      articleKeywords(["ಶ್ರವಣಬೆಳಗೊಳ, ಮಹಾಮಸ್ತಕಾಭಿಷೇಕ", "ಶ್ರವಣಬೆಳಗೊಳ, ಹಾಸನ", "ಹಾಸನ ಜಿಲ್ಲೆ"]),
    ).toEqual(["ಶ್ರವಣಬೆಳಗೊಳ", "ಮಹಾಮಸ್ತಕಾಭಿಷೇಕ", "ಹಾಸನ", "ಹಾಸನ ಜಿಲ್ಲೆ"]);
  });
});
