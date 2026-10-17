import type { Post } from "@/lib/types";

const short = (value?: string | null, max = 200) =>
  value && value.length > max ? value.slice(0, max - 1).trimEnd() + "…" : value || "";

/**
 * News cards render in the browser, so every field on the post is sent with the
 * page. Keep only what a card shows to keep the home page light.
 */
export function toCardPost(post: Post): Post {
  return {
    id: post.id,
    slug: post.slug,
    type: post.type,
    status: post.status,
    title_kn: post.title_kn,
    title_en: post.title_en,
    title_hi: post.title_hi,
    title_translit: "",
    summary_kn: short(post.summary_kn),
    summary_en: short(post.summary_en),
    summary_hi: short(post.summary_hi),
    body_html: "",
    thumbnail_url: post.thumbnail_url,
    event_date: post.event_date,
    event_place: post.event_place,
    published_at: post.published_at,
    category_slugs: post.category_slugs,
    is_featured: post.is_featured,
    is_breaking: post.is_breaking,
    is_live: post.is_live,
    is_seed: post.is_seed,
    video_url: null,
    video_id: null,
    video_provider: post.video_provider,
    duration_seconds: null,
    view_count: 0,
    tags: post.tags?.slice(0, 2),
  };
}
