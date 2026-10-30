import type { Filters } from "@/lib/utils/search";
import { getUiStrings } from "@/lib/i18n/server";
import { pickText } from "@/lib/i18n/content";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategories, getPublishedPlaceIds } from "@/lib/queries/content";
import { getV4Rows } from "@/lib/v4/queries";
import { CategoryListing } from "@/components/news/CategoryListing";
import {
  districtName,
  districtsWithContent,
} from "@/lib/utils/districts";
import { listActiveMathas, mathaName } from "@/lib/utils/mathas";
import { SocialMediaListing } from "@/components/news/SocialMediaListing";
import {
  JAIN_MATHA_SLUG,
  SOCIAL_MEDIA_SLUG,
  SOCIAL_POSTERS_SLUG,
  SOCIAL_VIDEOS_SLUG,
  STATE_JAIN_NEWS_SLUG,
  mathaHref,
  resolvePublicCategory,
  stateJainNewsDistrictHref,
} from "@/lib/taxonomy";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { kn, locale } = await getUiStrings();
  const { slug } = await params;
  const category = resolvePublicCategory(slug, await getCategories());
  return {
    title: category
      ? pickText(locale, category.name_kn, category.name_en, category.name_hi)
      : kn.notFound,
    alternates: { canonical: "/category/" + slug },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Filters & { page?: string; tab?: string }>;
}) {
  const { locale } = await getUiStrings();
  const { slug } = await params;
  const filters = await searchParams;
  const [categories, places, mathas, placeIds] = await Promise.all([
    getCategories(),
    getV4Rows("places").catch(() => []),
    getV4Rows("mathas").catch(() => []),
    getPublishedPlaceIds().catch(() => []),
  ]);
  const category = resolvePublicCategory(slug, categories);
  if (!category) notFound();
  const extraNav =
    slug === STATE_JAIN_NEWS_SLUG ? (
      <nav className="category-chips" aria-label={category.name_kn}>
        {districtsWithContent(places, placeIds, locale).map((district) => (
          <Link
            className="chip"
            href={stateJainNewsDistrictHref(district.slug)}
            key={district.id}
          >
            {districtName(locale, district)}
          </Link>
        ))}
      </nav>
    ) : slug === JAIN_MATHA_SLUG ? (
      <nav className="category-chips" aria-label={category.name_kn}>
        {listActiveMathas(mathas, locale).map((matha) => (
          <Link className="chip" href={mathaHref(matha.slug)} key={matha.id}>
            {mathaName(locale, matha)}
          </Link>
        ))}
      </nav>
    ) : null;
  if (
    slug === SOCIAL_MEDIA_SLUG ||
    slug === SOCIAL_POSTERS_SLUG ||
    slug === SOCIAL_VIDEOS_SLUG
  ) {
    return (
      <SocialMediaListing
        category={category}
        filters={filters}
        extraNav={extraNav}
      />
    );
  }
  return (
    <CategoryListing
      category={category}
      filters={filters}
      action={"/category/" + slug}
      extraNav={extraNav}
    />
  );
}
