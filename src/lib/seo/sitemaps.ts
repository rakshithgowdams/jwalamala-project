import { supabaseFetch } from "@/lib/supabase/fetch";
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { site } from "@/config/site";
import { xml } from "@/lib/v4/utils";
export const sitemapKinds = {
  posts: "posts",
  images: "posts",
  news: "posts",
  categories: "categories",
  events: "events",
  tags: "tags",
  topics: "topics",
  places: "places",
  authors: "authors",
  series: "series",
  gallery: "galleries",
  stories: "web_stories",
  live: "liveblogs",
  notices: "notices",
  opportunities: "opportunities",
  basadis: "basadis",
} as const;
export type SitemapKind = keyof typeof sitemapKinds;
const base = "http://www.sitemaps.org/schemas/sitemap/0.9";
export const PAGE_SIZE = 1000;
function query(kind: SitemapKind, count = false) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const db = createClient(url, key, {
    global: { fetch: supabaseFetch },
    auth: { persistSession: false },
  });
  const table = sitemapKinds[kind];
  let q = db
    .from(table)
    .select(
      table === "posts"
        ? "slug,type,title_kn,published_at,updated_at,thumbnail_url"
        : "slug,updated_at",
      { count: count ? "exact" : undefined, head: count },
    );
  if (table === "posts") {
    q = q
      .eq("status", "published")
      .eq("is_seed", false)
      .lte("published_at", new Date().toISOString());
    if (kind === "news")
      q = q.gte(
        "published_at",
        new Date(Date.now() - 48 * 3600000).toISOString(),
      );
  }
  if (
    [
      "galleries",
      "web_stories",
      "liveblogs",
      "notices",
      "opportunities",
      "basadis",
      "events",
    ].includes(table)
  )
    q = q.eq("is_seed", false);
  if (table === "opportunities")
    q = q.gte("last_date", new Date().toISOString().slice(0, 10));
  return q;
}
export async function sitemapCount(kind: SitemapKind) {
  if (site.demo) return 0;
  const q = query(kind, true);
  if (!q) return 0;
  const { count, error } = await q;
  if (error) throw error;
  return count || 0;
}
export function xmlResponse(body: string) {
  return new Response('<?xml version="1.0" encoding="UTF-8"?>' + body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
export async function sitemapIndex(kinds: SitemapKind[], includePages = false) {
  const counts = await Promise.all(
    kinds.map(async (kind) => ({ kind, count: await sitemapCount(kind) })),
  );
  const paths = includePages ? ["/sitemaps/pages/0"] : [];
  for (const { kind, count } of counts)
    for (let page = 0; page < Math.ceil(count / PAGE_SIZE); page++)
      paths.push("/sitemaps/" + kind + "/" + page);
  return xmlResponse(
    '<sitemapindex xmlns="' +
      base +
      '">' +
      paths
        .map((p) => "<sitemap><loc>" + xml(site.url + p) + "</loc></sitemap>")
        .join("") +
      "</sitemapindex>",
  );
}
export async function sitemapPage(kind: SitemapKind | "pages", page: number) {
  let entries = "";
  if (kind === "pages") {
    if (page !== 0) return new Response("Not found", { status: 404 });
    if (!site.demo)
      entries = [
        "/",
        "/news",
        "/videos",
        "/events",
        "/topics",
        "/series",
        "/gallery",
        "/stories",
        "/live",
        "/basadis",
        "/notices",
        "/opportunities",
        "/weather",
        "/jain-calendar",
        "/reservoirs",
        "/rates",
        "/about",
        "/contact",
        "/editorial-policy",
        "/corrections",
        "/fact-check-policy",
        "/ownership",
      ]
        .filter((p) => p !== "/news")
        .map((p) => "<url><loc>" + xml(site.url + p) + "</loc></url>")
        .join("");
  } else if (!site.demo) {
    const q = query(kind);
    if (!q) return xmlResponse('<urlset xmlns="' + base + '"></urlset>');
    const { data, error } = await q
      .order("slug")
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw error;
    for (const row of data || []) {
      const p = row as unknown as {
        slug: string;
        type?: string;
        title_kn?: string;
        published_at?: string;
        updated_at: string;
        thumbnail_url?: string;
      };
      const prefix =
        sitemapKinds[kind] === "posts"
          ? p.type === "article"
            ? "news"
            : "video"
          : (
              {
                categories: "category",
                events: "events",
                tags: "tag",
                topics: "topic",
                places: "place",
                authors: "author",
                series: "series",
                gallery: "gallery",
                stories: "stories",
                live: "live",
                notices: "notices",
                opportunities: "opportunities",
                basadis: "basadis",
              } as Record<string, string>
            )[kind];
      entries +=
        "<url><loc>" +
        xml(site.url + "/" + prefix + "/" + p.slug) +
        "</loc><lastmod>" +
        xml(p.updated_at) +
        "</lastmod>";
      if (kind === "news")
        entries +=
          "<news:news><news:publication><news:name>" +
          xml(site.fullName) +
          "</news:name><news:language>kn</news:language></news:publication><news:publication_date>" +
          xml(p.published_at || "") +
          "</news:publication_date><news:title>" +
          xml(p.title_kn || "") +
          "</news:title></news:news>";
      if (kind === "images" && p.thumbnail_url)
        entries +=
          "<image:image><image:loc>" +
          xml(new URL(p.thumbnail_url, site.url).href) +
          "</image:loc></image:image>";
      entries += "</url>";
    }
  }
  return xmlResponse(
    '<urlset xmlns="' +
      base +
      '" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">' +
      entries +
      "</urlset>",
  );
}
