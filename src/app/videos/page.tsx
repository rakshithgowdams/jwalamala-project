import { LocationFilter } from "@/components/search/LocationFilter";
import type { Filters } from "@/lib/utils/search";
import { ContinueWatching } from "@/components/engagement/ContinueWatching";
import { getUiStrings } from "@/lib/i18n/server";
import { AdSlot } from "@/components/ads/AdSlot";
import Link from "next/link";
import { getListing } from "@/lib/queries/listing";
import { Pagination } from "@/components/ui/Pagination";
import { NewsCard } from "@/components/news/NewsCard";
import { EmptyState } from "@/components/ui/Primitives";
export async function generateMetadata() {
  const { kn } = await getUiStrings();
  return {
    title: kn.videos,
    alternates: { canonical: "/videos" },
  };
}
export default async function Videos({
  searchParams,
}: {
  searchParams: Promise<Filters & { tab?: string; page?: string }>;
}) {
  const { kn } = await getUiStrings();

  const filters = await searchParams;
  const { tab, page } = filters;
  const result = await getListing(
    {
      ...filters,
      media: true,
      live: tab === "live",
      type: tab === "shorts" ? "short" : "",
    },
    page,
  );
  const posts = result.rows;
  return (
    <div className="container page-shell">
      <div className="page-heading">
        <h1>{kn.videos}</h1>
        <p>{kn.edition}</p>
      </div>
      <LocationFilter filters={filters} action="/videos" />
      <ContinueWatching />
      <AdSlot placement="videos-top" />
      <div className="ad-supported-layout">
        <div className="ad-supported-content">
          <div className="tabs">
            {[
              [undefined, kn.all],
              ["live", kn.live],
              ["shorts", kn.shorts],
            ].map(([value, label]) => (
              <Link
                key={label}
                className={tab === value ? "active" : ""}
                href={
                  "/videos?" +
                  new URLSearchParams({
                    ...filters,
                    tab: value || "",
                    page: "1",
                  })
                }
              >
                {label}
              </Link>
            ))}
          </div>
          {posts.length ? (
            <div className="news-grid">
              {posts.map((p) => (
                <NewsCard key={p.id} post={p} />
              ))}
            </div>
          ) : (
            <EmptyState title={kn.noResults} description={kn.tryAgain} />
          )}
          <Pagination page={result.page} pages={result.pages} query={filters} />
        </div>
        <aside className="ad-sidebar" aria-label={kn.advertisement}>
          <AdSlot placement="videos-sidebar" format="rectangle" />
        </aside>
      </div>
      <AdSlot placement="videos-bottom" />
    </div>
  );
}
