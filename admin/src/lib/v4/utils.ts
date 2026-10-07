import type { TrendingItem, PostTag, Topic, TopicPin } from "./types";
import type { Post } from "@/lib/types";
export function safePublicLink(value: string) {
  if (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !/[\\\u0000-\u0020]/.test(value)
  )
    return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function activeTrending(items: TrendingItem[], now = new Date()) {
  const time = now.getTime();
  return items
    .filter(
      (item) =>
        item.is_active &&
        safePublicLink(item.url) &&
        (!item.starts_at || Date.parse(item.starts_at) <= time) &&
        (!item.ends_at || Date.parse(item.ends_at) > time),
    )
    .sort((a, b) => a.sort_order - b.sort_order);
}
export function topicPosts(
  topic: Topic,
  pins: TopicPin[],
  links: PostTag[],
  posts: Post[],
) {
  const pinned = pins
    .filter((pin) => pin.topic_id === topic.id)
    .sort((a, b) => a.sort_order - b.sort_order);
  const ids = new Set(
    links
      .filter((link) => topic.tag_ids.includes(link.tag_id))
      .map((link) => link.post_id),
  );
  const ordered = [
    ...pinned.flatMap((pin) => posts.filter((p) => p.id === pin.post_id)),
    ...posts.filter((p) => ids.has(p.id)),
  ];
  return ordered.filter(
    (p, i) => ordered.findIndex((x) => x.id === p.id) === i,
  );
}
export function paginate<T>(rows: T[], value?: string, size = 9) {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const page = Math.min(
    pages,
    Math.max(
      1,
      Number.isFinite(Number(value)) ? Math.floor(Number(value)) || 1 : 1,
    ),
  );
  return {
    page,
    pages,
    rows: rows.slice((page - 1) * size, page * size),
    total: rows.length,
  };
}
export function xml(value: string) {
  return value.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
}
