import "server-only";
import { getPosts, getCategories } from "@/lib/queries/content";
import { getV4Rows } from "./queries";
import { topicPosts } from "./utils";
export async function getFeedData() {
  const [
    posts,
    categories,
    tags,
    links,
    topics,
    pins,
    series,
    episodes,
    places,
    authors,
  ] = await Promise.all([
    getPosts(),
    getCategories(),
    getV4Rows("tags"),
    getV4Rows("post_tags"),
    getV4Rows("topics"),
    getV4Rows("topic_pins"),
    getV4Rows("series"),
    getV4Rows("series_items"),
    getV4Rows("places"),
    getV4Rows("authors"),
  ]);
  const targets: Record<string, string[]> = {};
  for (const c of categories)
    targets["category:" + c.id] = posts
      .filter((p) => p.category_slugs.includes(c.slug))
      .map((p) => p.id);
  for (const tag of tags)
    targets["tag:" + tag.id] = links
      .filter((l) => l.tag_id === tag.id)
      .map((l) => l.post_id);
  for (const topic of topics)
    targets["topic:" + topic.id] = topicPosts(topic, pins, links, posts).map(
      (p) => p.id,
    );
  for (const s of series)
    targets["series:" + s.id] = episodes
      .filter((e) => e.series_id === s.id)
      .map((e) => e.post_id);
  for (const p of places)
    targets["place:" + p.id] = posts
      .filter(
        (post) => post.place_id === p.id || post.event_place === p.name_kn,
      )
      .map((p) => p.id);
  for (const a of authors)
    targets["author:" + a.id] = posts
      .filter((p) => p.public_author_id === a.id)
      .map((p) => p.id);
  return { posts, targets };
}
