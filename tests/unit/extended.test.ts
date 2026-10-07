import { describe, it, expect } from "vitest";
import { cleanHtml } from "@/lib/utils/sanitize";
import { redirectSchema } from "@/lib/v4/redirects";
import { watchSchema } from "@/lib/v4/watch-history";
describe("rich article safety", () => {
  it("retains tables and uploaded images while stripping scripts and tracking images", () => {
    const html = cleanHtml(
      '<table><tr><td>Fact</td></tr></table><img src="/images/logo.jpg" alt="Logo"><img src="https://tracking.example/pixel"><script>alert(1)</script>',
    );
    expect(html).toContain("<td>Fact</td>");
    expect(html).toContain("/images/logo.jpg");
    expect(html).not.toContain("tracking.example");
    expect(html).not.toContain("script");
  });
  it("keeps ImageKit images but not look-alike hosts", () => {
    const html = cleanHtml(
      '<img src="https://ik.imagekit.io/jwalamala/news/temple.jpg?tr=w-1200" alt="Temple"><img src="https://ik.imagekit.io.evil.example/x/pixel.gif"><img src="http://ik.imagekit.io/jwalamala/plain.jpg">',
    );
    expect(html).toContain(
      "https://ik.imagekit.io/jwalamala/news/temple.jpg?tr=w-1200",
    );
    expect(html).not.toContain("evil.example");
    expect(html).not.toContain("http://ik.imagekit.io");
  });
  it("marks sponsored links and rejects javascript URLs", () => {
    expect(
      cleanHtml('<a href="https://example.com">Sponsor</a>', true),
    ).toContain('rel="sponsored noopener noreferrer"');
    expect(cleanHtml('<a href="javascript:alert(1)">Unsafe</a>')).not.toContain(
      "javascript:",
    );
  });
});
it("rejects external, encoded and self redirects", () => {
  for (const path of ["//evil.example", "/\\evil", "/%2fevil", "/bad\npath"])
    expect(
      redirectSchema.safeParse({ old_path: "/old", new_path: path }).success,
    ).toBe(false);
  expect(
    redirectSchema.safeParse({ old_path: "/old", new_path: "/old" }).success,
  ).toBe(false);
  expect(
    redirectSchema.safeParse({ old_path: "/?p=42", new_path: "/news/story" })
      .success,
  ).toBe(true);
});
it("watch history only accepts public video paths and bounded progress", () => {
  expect(
    watchSchema.safeParse([
      {
        id: "1",
        title: "Video",
        href: "//evil.example",
        seconds: 20,
        updated_at: "2026-09-16",
      },
    ]).success,
  ).toBe(false);
});
