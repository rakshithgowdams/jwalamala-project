import { getUiStrings } from "@/lib/i18n/server";
import { getListing } from "@/lib/queries/listing";
import type { Filters } from "@/lib/utils/search";
import { LocationFilter } from "@/components/search/LocationFilter";
import { NewsCard } from "@/components/news/NewsCard";
import { EmptyState } from "@/components/ui/Primitives";
import { Pagination } from "@/components/ui/Pagination";
import { AdSlot } from "@/components/ads/AdSlot";
export async function generateMetadata() {
  const { kn } = await getUiStrings();
  return {
    title: kn.news,
    alternates: { canonical: "/news" },
  };
}
export default async function News({
  searchParams,
}: {
  searchParams: Promise<Filters & { page?: string }>;
}) {
  const filters = await searchParams;
  const [{ kn }, result] = await Promise.all([
    getUiStrings(),
    getListing(filters, filters.page),
  ]);
  return (
    <div className="container page-shell">
      <div className="page-heading">
        <h1>{kn.news}</h1>
      </div>
      <LocationFilter filters={filters} action="/news" />
      <AdSlot placement="news-top" />
      <div className="ad-supported-layout">
        <div className="ad-supported-content">
          <p className="results-count">
            {result.total} {kn.results}
          </p>
          {result.rows.length ? (
            <div className="news-grid">
              {result.rows.map((post) => (
                <NewsCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
          <Pagination page={result.page} pages={result.pages} query={filters} />
        </div>
        <aside className="ad-sidebar" aria-label={kn.advertisement}>
          <AdSlot placement="news-sidebar" format="rectangle" />
        </aside>
      </div>
      <AdSlot placement="news-bottom" />
    </div>
  );
}
