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
  ProgrammeSiblingNav,
  ProgrammesHub,
} from "@/components/news/ProgrammesHub";
import { getSetting } from "@/lib/v4/settings";
import {
  enabledProgrammeCards,
  parseProgrammesHub,
} from "@/lib/v4/programmes";
import {
  JAIN_MATHA_SLUG,
  JWALAMALA_PROGRAMMES_SLUG,
  SOCIAL_MEDIA_SLUG,
  SOCIAL_POSTERS_SLUG,
  SOCIAL_VIDEOS_SLUG,
  STATE_JAIN_NEWS_SLUG,
  categoryKind,
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
  searchParams: Promise<
    Filters & { page?: string; tab?: string; view?: string }
  >;
}) {
  const { kn, locale } = await getUiStrings();
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
  if (slug === JWALAMALA_PROGRAMMES_SLUG) {
    return <ProgrammesHub category={category} filters={filters} />;
  }
  const programmeHub =
    categoryKind(category) === "programme" ||
    slug === "weekly-jain-news" ||
    slug === SOCIAL_VIDEOS_SLUG ||
    slug === SOCIAL_MEDIA_SLUG
      ? parseProgrammesHub(await getSetting("programmes_hub").catch(() => null))
      : null;
  const programmeCards = programmeHub
    ? enabledProgrammeCards(programmeHub)
    : [];
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
    ) : programmeCards.length ? (
      <ProgrammeSiblingNav
        cards={programmeCards}
        currentHref={"/category/" + slug}
        locale={locale}
        label={kn.programmesShows}
      />
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
      crumbs={
        programmeCards.length ? (
          <>
            <Link href={"/category/" + JWALAMALA_PROGRAMMES_SLUG}>
              {kn.programmesHubKicker}
            </Link>
            <span>/</span>
            {pickText(
              locale,
              category.name_kn,
              category.name_en,
              category.name_hi,
            )}
          </>
        ) : undefined
      }
    />
  );
}
