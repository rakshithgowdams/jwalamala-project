import type { Post, NewsEvent } from "@/lib/types";
import { xml } from "@/lib/v4/utils";
import { site } from "@/config/site";
export function bulletin(posts: Post[], note = "") {
  return [
    note,
    ...posts.map(
      (p) =>
        "*" +
        p.title_kn +
        "*\n" +
        p.summary_kn.slice(0, 240) +
        "\n" +
        new URL(
          "/" + (p.type === "article" ? "news" : "video") + "/" + p.slug,
          site.url,
        ).href,
    ),
  ]
    .filter(Boolean)
    .join("\n\n");
}
export function newsletterHtml(
  posts: Post[],
  events: NewsEvent[],
  note: string,
) {
  return (
    '<div lang="kn"><h1>' +
    xml(site.fullName) +
    "</h1><p>" +
    xml(note) +
    "</p>" +
    posts
      .map(
        (p) =>
          '<article><h2><a href="' +
          xml(
            new URL(
              "/" + (p.type === "article" ? "news" : "video") + "/" + p.slug,
              site.url,
            ).href,
          ) +
          '">' +
          xml(p.title_kn) +
          "</a></h2><p>" +
          xml(p.summary_kn) +
          "</p></article>",
      )
      .join("") +
    events
      .map(
        (e) =>
          "<p>" +
          xml(e.start_date + " · " + e.name_kn + " · " + e.place) +
          "</p>",
      )
      .join("") +
    "</div>"
  );
}
