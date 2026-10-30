import type { ReactNode } from "react";
import Link from "next/link";
import { LocationFilter } from "@/components/search/LocationFilter";
import type { Filters } from "@/lib/utils/search";
import { getListing } from "@/lib/queries/listing";
import { getUiStrings } from "@/lib/i18n/server";
import { pickText } from "@/lib/i18n/content";
import { AdSlot } from "@/components/ads/AdSlot";
import { getPosts } from "@/lib/queries/content";
import { NewsCard } from "@/components/news/NewsCard";
import { EmptyState } from "@/components/ui/Primitives";
import type { Category } from "@/lib/types";
import {
  categoryKind,
  defaultListSort,
  usesEventDateFilter,
} from "@/lib/taxonomy";

export async function CategoryListing({
  category,
  filters,
  action,
  extraNav,
  listingFilters,
  crumbs,
}: {
  category: Category;
  filters: Filters & { page?: string };
  action: string;
  extraNav?: ReactNode;
  listingFilters?: Filters & { matha?: string };
  crumbs?: ReactNode;
}) {
  const { kn, locale } = await getUiStrings();
  const kind = categoryKind(category);
  const eventDates = usesEventDateFilter(kind);
  const sort = filters.sort || defaultListSort(kind);
  const query = {
    ...filters,
    category: category.slug,
    sort,
    ...(eventDates ? {} : { year: "", from: "", to: "" }),
    ...listingFilters,
  };
  const [posts, listing] = await Promise.all([
    getPosts(),
    getListing(query, filters.page, 9),
  ]);
  const name = pickText(
    locale,
    category.name_kn,
    category.name_en,
    category.name_hi,
  );
  const years = [
    ...new Set(
      posts.map((post) =>
        eventDates
          ? post.event_date.slice(0, 4)
          : post.published_at.slice(0, 4),
      ),
    ),
  ].filter(Boolean);
  const pageQuery = (page: number) =>
    "?" +
    new URLSearchParams({
      ...Object.fromEntries(
        Object.entries(filters).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      ),
      page: String(page),
    });
  return (
    <div className="container page-shell">
      <div className="breadcrumb">
        <Link href="/">{kn.home}</Link>
        <span>/</span>
        {crumbs || name}
      </div>
      <div className="page-heading">
        <h1>{name}</h1>
      </div>
      {extraNav}
      <AdSlot placement={`category-${category.slug}-top`} />
      <div className="ad-supported-layout">
        <div className="ad-supported-content">
          <LocationFilter filters={filters} action={action} />
          <form className="filters filter-row">
            {["state", "district", "city"].map((key) => (
              <input
                key={key}
                type="hidden"
                name={key}
                value={filters[key as keyof typeof filters] || ""}
              />
            ))}
            {eventDates && (
              <label className="field">
                {kn.year}
                <select name="year" defaultValue={filters.year || ""}>
                  <option value="">{kn.all}</option>
                  {years.map((year) => (
                    <option key={year}>{year}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="field">
              {kn.sort}
              <select name="sort" defaultValue={sort}>
                <option value="newest">{kn.newest}</option>
                <option value="oldest">{kn.oldest}</option>
                {eventDates && (
                  <option value="event_date">{kn.eventDate}</option>
                )}
              </select>
            </label>
            <button className="button button-ember">{kn.filter}</button>
          </form>
          {listing.rows.length ? (
            <div className="news-grid">
              {listing.rows.map((post) => (
                <NewsCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
          <nav className="pagination">
            {Array.from(
              { length: Math.min(listing.pages, 7) },
              (_, index) =>
                index +
                Math.max(0, Math.min(listing.page - 4, listing.pages - 7)),
            ).map((i) => (
              <Link
                aria-current={listing.page === i + 1 ? "page" : undefined}
                className={"chip " + (listing.page === i + 1 ? "active" : "")}
                key={i}
                href={pageQuery(i + 1)}
              >
                {i + 1}
              </Link>
            ))}
          </nav>
        </div>
        <aside className="ad-sidebar" aria-label={kn.advertisement}>
          <AdSlot
            placement={`category-${category.slug}-sidebar`}
            format="rectangle"
          />
        </aside>
      </div>
      <AdSlot placement={`category-${category.slug}-bottom`} />
    </div>
  );
}
