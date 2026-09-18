import { getPosts } from "@/lib/queries/content";
import { getV4Rows } from "@/lib/v4/queries";
import { site } from "@/config/site";
import { xml } from "@/lib/v4/utils";
export async function GET(request: Request) {
  const url = new URL(request.url),
    category = url.searchParams.get("category"),
    tag = url.searchParams.get("tag");
  let posts = await getPosts();
  if (category)
    posts = posts.filter((post) => post.category_slugs.includes(category));
  if (tag) {
    const entity = (await getV4Rows("tags")).find((row) => row.slug === tag);
    const ids = new Set(
      (await getV4Rows("post_tags"))
        .filter((link) => link.tag_id === entity?.id)
        .map((link) => link.post_id),
    );
    posts = posts.filter((post) => ids.has(post.id));
  }
  const items = posts
    .slice(0, 30)
    .map((post) => {
      const link =
        site.url +
        "/" +
        (post.type === "article" ? "news" : "video") +
        "/" +
        post.slug;
      return `<item><title>${xml(post.title_kn)}</title><link>${xml(link)}</link><guid>${xml(link)}</guid><description>${xml(post.summary_kn)}</description><pubDate>${new Date(post.published_at).toUTCString()}</pubDate></item>`;
    })
    .join("");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${xml(site.fullName)}</title><link>${xml(site.url)}</link><description>${xml(site.description)}</description><language>kn-IN</language>${items}</channel></rss>`,
    {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "X-Robots-Tag": site.demo ? "noindex" : "all",
      },
    },
  );
}
