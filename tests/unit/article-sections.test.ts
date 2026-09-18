import { describe, it, expect } from "vitest";
import { articleSections } from "../../src/lib/ads/article-sections";
describe("Article advertisement boundaries", () => {
  it("inserts after top-level paragraphs two and six only for long stories", () => {
    const body = Array.from({ length: 8 }, (_, i) => "<p>" + i + "</p>").join(
      "",
    );
    const parts = articleSections(body);
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe("<p>0</p><p>1</p>");
    expect(parts.join("")).toBe(body);
  });
  it("preserves lists, quotes and tables", () => {
    const nested =
      "<blockquote><p>quote</p></blockquote><ul><li><p>list</p></li></ul><table><tbody><tr><td><p>cell</p></td></tr></tbody></table>";
    const body = nested + "<p>text</p>".repeat(5);
    expect(articleSections(body)).toEqual([body]);
  });
});
