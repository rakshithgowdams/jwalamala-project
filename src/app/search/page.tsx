import { getV4Rows } from "@/lib/v4/queries";
import Link from "next/link";
import { getListing } from "@/lib/queries/listing";
import { getUiStrings } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { getCategories } from "@/lib/queries/content";
import { SearchForm } from "@/components/search/SearchForm";
import { type Filters } from "@/lib/utils/search";
import { NewsCard } from "@/components/news/NewsCard";
import { EmptyState } from "@/components/ui/Primitives";
export async function generateMetadata(): Promise<Metadata> {
  const { kn } = await getUiStrings();
  return {
    title: kn.search,
    robots: { index: false, follow: true },
  };
}
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Filters & { page?: string }>;
}) {
  const { kn } = await getUiStrings();

  const filters = await searchParams;
  const [listing, categories, places] = await Promise.all([
    getListing(filters, filters.page),
    getCategories(),
    getV4Rows("places"),
  ]);
  const results = listing.rows;
  return (
    <div className="container page-shell">
      <div className="page-heading">
        <h1>{kn.search}</h1>
        <p>{kn.searchHint}</p>
      </div>
      <SearchForm filters={filters} categories={categories} places={places} />
      <p className="results-count">
        {listing.total} {kn.results}
      </p>
      {results.length ? (
        <div className="news-grid">
          {results.map((p) => (
            <NewsCard post={p} key={p.id} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
      <nav className="pagination">
        {listing.page > 1 && (
          <Link
            className="chip"
            href={
              "?" +
              new URLSearchParams({
                ...filters,
                page: String(listing.page - 1),
              })
            }
          >
            {kn.previous}
          </Link>
        )}
        {listing.page < listing.pages && (
          <Link
            className="chip"
            href={
              "?" +
              new URLSearchParams({
                ...filters,
                page: String(listing.page + 1),
              })
            }
          >
            {kn.next}
          </Link>
        )}
      </nav>
    </div>
  );
}
