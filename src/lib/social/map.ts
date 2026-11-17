import { SOCIAL_POSTERS_SLUG, SOCIAL_VIDEOS_SLUG } from "@/lib/taxonomy";
import { slugify } from "@/lib/utils/slug";
import { normalizeVideo } from "@/lib/utils/video";

export { SOCIAL_POSTERS_SLUG, SOCIAL_VIDEOS_SLUG };
export const POST_MEDIA_BUCKET = "post-media";

export type SocialPlatform = "facebook" | "instagram";
export type MappedSocialPost = {
  type: "article" | "video" | "short";
  categorySlug: typeof SOCIAL_POSTERS_SLUG | typeof SOCIAL_VIDEOS_SLUG;
  social_platform: SocialPlatform;
  social_post_url: string;
  social_post_id: string;
  title_kn: string;
  summary_kn: string;
  slug: string;
  published_at: string;
  event_date: string;
  thumbnail_url: string;
  image_urls: string[];
  image_layout: "single" | "split2" | "collage3" | "video";
  video_url: string | null;
  video_id: string | null;
  video_provider: "facebook" | "instagram" | "none";
  view_count: number;
  source: "dataset";
  status: "published";
};

type Loose = Record<string, unknown>;

function asObject(value: unknown): Loose | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Loose)
    : null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function socialItems(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const obj = asObject(raw);
  if (!obj) return [];
  if (Array.isArray(obj.items)) return obj.items;
  if (Array.isArray(obj.data)) return obj.data;
  return [];
}

function platformOf(item: Loose, url: string): SocialPlatform | null {
  if (url.includes("instagram.com") || url.includes("instagr.am") || asString(item.shortCode))
    return "instagram";
  if (url.includes("facebook.com") || url.includes("fb.watch") || asString(item.postId))
    return "facebook";
  return null;
}

function parseTime(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value < 1e12 ? value * 1000 : value;
    const date = new Date(ms);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return new Date().toISOString();
}

function shortId(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toLowerCase() || "post";
}

function captionParts(caption: string, publishedAt: string) {
  const lines = caption
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const first = lines[0] || "";
  const fallback =
    "ಜ್ವಾಲಾಮಾಲ ನ್ಯೂಸ್ – " + publishedAt.slice(0, 10);
  const title_kn = (first.slice(0, 120) || fallback).trim();
  const leftover = first.length > 120 ? first.slice(120).trim() : "";
  const summary_kn = [leftover, ...lines.slice(1)].filter(Boolean).join("\n");
  return { title_kn, summary_kn };
}

function imageLayout(count: number): MappedSocialPost["image_layout"] {
  if (count >= 3) return "collage3";
  if (count === 2) return "split2";
  return "single";
}

function collectImages(item: Loose) {
  const urls: string[] = [];
  const push = (value: unknown) => {
    const url = asString(value);
    if (url && /^https?:\/\//i.test(url) && !urls.includes(url) && urls.length < 3)
      urls.push(url);
  };
  push(item.displayUrl);
  push(item.display_url);
  const media = item.media;
  if (Array.isArray(media)) {
    for (const entry of media) {
      const row = asObject(entry);
      if (!row) continue;
      push(row.thumbnail);
      const photo = asObject(row.photo_image);
      push(photo?.uri);
      push(row.image);
      push(row.url);
    }
  }
  if (Array.isArray(item.images)) for (const image of item.images) push(image);
  const children = item.childPosts;
  if (Array.isArray(children)) {
    for (const child of children) {
      const row = asObject(child);
      push(row?.displayUrl);
    }
  }
  return urls;
}

function isVideoItem(item: Loose, url: string, platform: SocialPlatform) {
  if (item.isVideo === true) return true;
  const type = asString(item.type).toLowerCase();
  if (type === "video") return true;
  if (platform === "instagram" && /\/(?:reel|reels|tv|share)\//i.test(url))
    return true;
  if (platform === "facebook" && /\/(?:watch\/?\?v=|reel\/|videos\/)/i.test(url))
    return true;
  return false;
}

function isReel(item: Loose, url: string, videoKind?: string) {
  if (videoKind === "reel") return true;
  const type = asString(item.type).toLowerCase();
  if (type === "reel" || type === "short") return true;
  return /\/(?:reel|reels|shorts)\//i.test(url);
}

export function mapSocialItem(raw: unknown): MappedSocialPost | null {
  const item = asObject(raw);
  if (!item) return null;
  const url =
    asString(item.url) ||
    asString(item.inputUrl) ||
    asString(item.postUrl) ||
    asString(item.permalink);
  const platform = platformOf(item, url);
  if (!platform || !url) return null;
  const social_post_id =
    asString(item.postId) ||
    asString(item.shortCode) ||
    asString(item.id) ||
    shortId(url);
  const published_at = parseTime(item.time ?? item.timestamp ?? item.date);
  const caption =
    asString(item.text) ||
    asString(item.caption) ||
    asString(item.message);
  const { title_kn, summary_kn } = captionParts(caption, published_at);
  const video = isVideoItem(item, url, platform);
  const parsed = video ? normalizeVideo(url) : null;
  const images = collectImages(item);
  const thumbnail =
    images[0] ||
    asString(item.displayUrl) ||
    "/images/jwalamala-logo.jpg";
  const slugBase = slugify(title_kn) || "social-" + platform;
  const slug = (slugBase + "-" + shortId(social_post_id)).replace(/-+/g, "-");
  if (video) {
    const reel = isReel(item, url, parsed?.kind);
    return {
      type: reel ? "short" : "video",
      categorySlug: SOCIAL_VIDEOS_SLUG,
      social_platform: platform,
      social_post_url: url,
      social_post_id,
      title_kn,
      summary_kn,
      slug,
      published_at,
      event_date: published_at.slice(0, 10),
      thumbnail_url: thumbnail,
      image_urls: images.slice(0, 1),
      image_layout: "video",
      video_url: parsed?.url || url,
      video_id: parsed?.id || social_post_id,
      video_provider: parsed?.provider === "instagram" ? "instagram" : "facebook",
      view_count: asNumber(item.videoPostViewCount) || asNumber(item.videoViewCount),
      source: "dataset",
      status: "published",
    };
  }
  return {
    type: "article",
    categorySlug: SOCIAL_POSTERS_SLUG,
    social_platform: platform,
    social_post_url: url,
    social_post_id,
    title_kn,
    summary_kn,
    slug,
    published_at,
    event_date: published_at.slice(0, 10),
    thumbnail_url: thumbnail,
    image_urls: images,
    image_layout: imageLayout(Math.max(images.length, 1)),
    video_url: null,
    video_id: null,
    video_provider: "none",
    view_count: asNumber(item.likesCount) || asNumber(item.likes),
    source: "dataset",
    status: "published",
  };
}
