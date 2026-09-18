import { getUiStrings } from "@/lib/i18n/server";
import { getPosts } from "@/lib/queries/content";
import { NewsCard } from "@/components/news/NewsCard";
import { EmptyState } from "@/components/ui/Primitives";
import { AdSlot } from "@/components/ads/AdSlot";
export async function generateMetadata() {
  const { kn } = await getUiStrings();
  return { title: kn.shorts };
}
export default async function Page() {
  const { kn } = await getUiStrings();

  const posts = (await getPosts()).filter((post) => post.type === "short");
  return (
    <div className="container page-shell">
      <h1>{kn.shorts}</h1>
      <AdSlot placement="shorts-top" />
      {posts.length ? (
        <div className="news-grid shorts-grid">
          {posts.map((post) => (
            <NewsCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
      <AdSlot placement="shorts-bottom" />
    </div>
  );
}
