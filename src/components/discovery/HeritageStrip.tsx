import { getV4Rows } from "@/lib/v4/queries";
import { topicPosts } from "@/lib/v4/utils";
import { getPosts } from "@/lib/queries/content";
import { NewsCard } from "@/components/news/NewsCard";
import { SectionTitle } from "@/components/ui/Primitives";
import type { Topic } from "@/lib/v4/types";

export async function HeritageStrip() {
  const [topics, pins, links, posts] = await Promise.all([
    getV4Rows("topics"),
    getV4Rows("topic_pins"),
    getV4Rows("post_tags"),
    getPosts(),
  ]);
  const topic = topics.find(
    (t): t is Topic => t.slug === "jain-heritage" && t.is_active,
  );
  if (!topic) return null;
  const items = topicPosts(topic, pins, links, posts).slice(0, 10);
  if (!items.length) return null;
  return (
    <section className="heritage-strip">
      <SectionTitle href={`/topic/${topic.slug}`}>
        {topic.title_kn}
      </SectionTitle>
      <div className="heritage-track">
        {items.map((post) => (
          <div className="heritage-card" key={post.id}>
            <NewsCard post={post} />
          </div>
        ))}
      </div>
    </section>
  );
}
