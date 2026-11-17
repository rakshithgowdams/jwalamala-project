import type { Filters } from "@/lib/utils/search";
import { getUiStrings } from "@/lib/i18n/server";
import { pickText } from "@/lib/i18n/content";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategories, getPublishedPlaceIds } from "@/lib/queries/content";
import { getV4Rows } from "@/lib/v4/queries";
import { CategoryListing } from "@/components/news/CategoryListing";
import {
  DISTRICT_STATE,
  districtName,
  districtsWithContent,
  listDistricts,
} from "@/lib/utils/districts";
import { listActiveMathas, mathaName } from "@/lib/utils/mathas";
import { placeState } from "@/lib/utils/geography";
import {
  JAIN_MATHA_SLUG,
  STATE_JAIN_NEWS_SLUG,
  mathaHref,
  resolvePublicCategory,
  stateJainNewsDistrictHref,
} from "@/lib/taxonomy";

type Props = {
  params: Promise<{ slug: string; child: string }>;
  searchParams: Promise<Filters & { page?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const [{ slug, child }, { kn, locale }] = await Promise.all([
    params,
    getUiStrings(),
  ]);
  const category = resolvePublicCategory(slug, await getCategories());
  if (!category) return { title: kn.notFound };
  const categoryName = pickText(
    locale,
    category.name_kn,
    category.name_en,
    category.name_hi,
  );
  if (slug === STATE_JAIN_NEWS_SLUG) {
    const places = await getV4Rows("places").catch(() => []);
    const district = listDistricts(places, locale, { includeHidden: true }).find(
      (row) => row.slug === child,
    );
    if (!district) return { title: kn.notFound };
    const name = districtName(locale, district);
    return {
      title: name + " | " + categoryName,
      alternates: { canonical: stateJainNewsDistrictHref(district.slug) },
    };
  }
  if (slug === JAIN_MATHA_SLUG) {
    const mathas = await getV4Rows("mathas").catch(() => []);
    const matha = listActiveMathas(mathas, locale).find(
      (row) => row.slug === child,
    );
    if (!matha) return { title: kn.notFound };
    const name = mathaName(locale, matha);
    return {
      title: name + " | " + categoryName,
      alternates: { canonical: mathaHref(matha.slug) },
    };
  }
  return { title: kn.notFound };
}

export default async function CategoryChildPage({
  params,
  searchParams,
}: Props) {
  const [{ slug, child }, filters, { locale }] = await Promise.all([
    params,
    searchParams,
    getUiStrings(),
  ]);
  const [categories, places, mathas, placeIds] = await Promise.all([
    getCategories(),
    getV4Rows("places").catch(() => []),
    getV4Rows("mathas").catch(() => []),
    getPublishedPlaceIds().catch(() => []),
  ]);
  const category = resolvePublicCategory(slug, categories);
  if (!category) notFound();
  const categoryName = pickText(
    locale,
    category.name_kn,
    category.name_en,
    category.name_hi,
  );

  if (slug === STATE_JAIN_NEWS_SLUG) {
    const district = listDistricts(places, locale, { includeHidden: true }).find(
      (row) => row.slug === child,
    );
    if (!district) notFound();
    const name = districtName(locale, district);
    const locked = {
      ...filters,
      state: placeState(district) || DISTRICT_STATE,
      district: district.district,
    };
    return (
      <CategoryListing
        category={{ ...category, name_kn: name, name_en: district.name_en }}
        filters={locked}
        listingFilters={locked}
        action={stateJainNewsDistrictHref(district.slug)}
        crumbs={
          <>
            <Link href={"/category/" + STATE_JAIN_NEWS_SLUG}>
              {categoryName}
            </Link>
            <span>/</span>
            {name}
          </>
        }
        extraNav={
          <nav className="category-chips" aria-label={categoryName}>
            {districtsWithContent(places, placeIds, locale).map((row) => (
              <Link
                className={"chip" + (row.slug === district.slug ? " active" : "")}
                href={stateJainNewsDistrictHref(row.slug)}
                key={row.id}
              >
                {districtName(locale, row)}
              </Link>
            ))}
          </nav>
        }
      />
    );
  }

  if (slug === JAIN_MATHA_SLUG) {
    const matha = listActiveMathas(mathas, locale).find(
      (row) => row.slug === child,
    );
    if (!matha) notFound();
    const name = mathaName(locale, matha);
    return (
      <CategoryListing
        category={{ ...category, name_kn: name, name_en: matha.name_en }}
        filters={filters}
        listingFilters={{ matha: matha.slug, category: "" }}
        action={mathaHref(matha.slug)}
        crumbs={
          <>
            <Link href={"/category/" + JAIN_MATHA_SLUG}>{categoryName}</Link>
            <span>/</span>
            {name}
          </>
        }
        extraNav={
          <nav className="category-chips" aria-label={categoryName}>
            {listActiveMathas(mathas, locale).map((row) => (
              <Link
                className={"chip" + (row.slug === matha.slug ? " active" : "")}
                href={mathaHref(row.slug)}
                key={row.id}
              >
                {mathaName(locale, row)}
              </Link>
            ))}
          </nav>
        }
      />
    );
  }

  notFound();
}
