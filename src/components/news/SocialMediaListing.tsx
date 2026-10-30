import type { ReactNode } from "react";
import Link from "next/link";
import { LocationFilter } from "@/components/search/LocationFilter";
import type { Filters } from "@/lib/utils/search";
import { getListing } from "@/lib/queries/listing";
import { getCategories } from "@/lib/queries/content";
import { getUiStrings } from "@/lib/i18n/server";
import { pickText } from "@/lib/i18n/content";
import { AdSlot } from "@/components/ads/AdSlot";
import { NewsCard } from "@/components/news/NewsCard";
import { PosterGrid } from "@/components/news/PosterGrid";
import { EmptyState } from "@/components/ui/Primitives";
import type { Category } from "@/lib/types";
import {
  SOCIAL_MEDIA_SLUG,
  SOCIAL_POSTERS_SLUG,
  SOCIAL_VIDEOS_SLUG,
} from "@/lib/taxonomy";

export async function SocialMediaListing({
  category,
  filters,
  extraNav,
}: {
  category: Category;
  filters: Filters & { page?: string; tab?: string };
  extraNav?: ReactNode;
}) {
  const { kn, locale } = await getUiStrings();
  const posters = category.slug !== SOCIAL_VIDEOS_SLUG && filters.tab !== "videos";
  const listSlug = posters ? SOCIAL_POSTERS_SLUG : SOCIAL_VIDEOS_SLUG;
  const [listing, categories] = await Promise.all([
    getListing(
      { ...filters, category: listSlug, sort: filters.sort || "newest" },
      filters.page,
      9,
    ),
    getCategories(),
  ]);
  const name = pickText(
    locale,
    category.name_kn,
    category.name_en,
    category.name_hi,
  );
  const labelFor = (slug: string, fallback: string) => {
    const row = categories.find((item) => item.slug === slug);
    return row
      ? pickText(locale, row.name_kn, row.name_en, row.name_hi)
      : fallback;
  };
  const postersLabel = labelFor(SOCIAL_POSTERS_SLUG, "ಪೋಸ್ಟರ್‌ಗಳು");
  const videosLabel = labelFor(SOCIAL_VIDEOS_SLUG, kn.videos);
  const parentLabel = labelFor(SOCIAL_MEDIA_SLUG, "ಸಾಮಾಜಿಕ ಜಾಲತಾಣ");
  const pageQuery = (page: number, tab = posters ? "posters" : "videos") =>
    "?" +
    new URLSearchParams({
      ...Object.fromEntries(
        Object.entries(filters).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      ),
      tab,
      page: String(page),
    });
  const tabHref = (tab: "posters" | "videos") =>
    category.slug === SOCIAL_MEDIA_SLUG
      ? pageQuery(1, tab)
      : "/category/" + (tab === "posters" ? SOCIAL_POSTERS_SLUG : SOCIAL_VIDEOS_SLUG);
  return (
    <div className="container page-shell">
      <div className="breadcrumb">
        <Link href="/">{kn.home}</Link>
        <span>/</span>
        {category.slug === SOCIAL_MEDIA_SLUG ? (
          name
        ) : (
          <>
            <Link href={"/category/" + SOCIAL_MEDIA_SLUG}>
              {parentLabel}
            </Link>
            <span>/</span>
            {name}
          </>
        )}
      </div>
      <div className="page-heading">
        <h1>{name}</h1>
      </div>
      <nav className="category-chips" aria-label={name}>
        <Link
          className={"chip" + (posters ? " active" : "")}
          href={tabHref("posters")}
        >
          {postersLabel}
        </Link>
        <Link
          className={"chip" + (!posters ? " active" : "")}
          href={tabHref("videos")}
        >
          {videosLabel}
        </Link>
      </nav>
      {extraNav}
      <AdSlot placement={`category-${category.slug}-top`} />
      <div className="ad-supported-layout">
        <div className="ad-supported-content">
          <LocationFilter
            filters={filters}
            action={"/category/" + category.slug}
          />
          {listing.rows.length ? (
            posters ? (
              <PosterGrid posts={listing.rows} />
            ) : (
              <div className="news-grid shorts-grid">
                {listing.rows.map((post) => (
                  <NewsCard key={post.id} post={post} />
                ))}
              </div>
            )
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
