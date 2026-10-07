import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getUiStrings } from "@/lib/i18n/server";
import { pickText } from "@/lib/i18n/content";
import { getCategories, getPosts } from "@/lib/queries/content";
import { getListing } from "@/lib/queries/listing";
import { getV4Rows } from "@/lib/v4/queries";
import { site } from "@/config/site";
import { HeroStory, NewsCard } from "@/components/news/NewsCard";
import { CategoryScrollShowcase } from "@/components/discovery/CategoryScrollShowcase";
import { FollowButton } from "@/components/engagement/FollowButton";
import { AdSlot } from "@/components/ads/AdSlot";
import { Pagination } from "@/components/ui/Pagination";
import {
  EmptyState,
  SampleNotice,
  SectionTitle,
} from "@/components/ui/Primitives";
import { placeState } from "@/lib/utils/geography";
import { BusinessAdShelf } from "@/components/ads/BusinessAds";
import { getBusinessAds } from "@/lib/ads/business-server";
import { pickBusinessAds } from "@/lib/ads/business";
import { advertisingCopy } from "@/content/advertising";
import {
  districtName,
  listDistricts,
  postsInDistrict,
  townsInDistrict,
} from "@/lib/utils/districts";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const [{ slug }, { kn, v4: t, locale }, places] = await Promise.all([
    params,
    getUiStrings(),
    getV4Rows("places"),
  ]);
  const district = listDistricts(places, locale).find((d) => d.slug === slug);
  if (!district) return { title: kn.notFound };
  return {
    title: districtName(locale, district) + " | " + t.districtNews,
    description:
      pickText(
        locale,
        district.description_kn || "",
        district.description_en,
        district.description_hi,
      ) || t.districtNewsIntro,
    alternates: { canonical: "/districts/" + district.slug },
  };
}

export default async function DistrictPage({ params, searchParams }: Props) {
  const [{ slug }, { page }, { kn, v4: t, locale }] = await Promise.all([
    params,
    searchParams,
    getUiStrings(),
  ]);
  const [places, posts, categories, businessAds] = await Promise.all([
    getV4Rows("places"),
    getPosts(),
    getCategories(),
    getBusinessAds(),
  ]);
  const districts = listDistricts(places, locale);
  const district = districts.find((d) => d.slug === slug);
  if (!district) notFound();
  const filters = { state: placeState(district), district: district.district };
  const results = await getListing(filters, page);
  const recent = postsInDistrict(posts, places, district);
  const lead = recent.find((post) => post.is_featured) || recent[0];
  const name = districtName(locale, district);
  const description = pickText(
    locale,
    district.description_kn || "",
    district.description_en,
    district.description_hi,
  );
  const towns = townsInDistrict(places, district);
  const firstPage = results.page === 1;
  const shops = pickBusinessAds(businessAds, {
    districtId: district.id,
    district: district.district,
    count: 8,
  });
  return (
    <div className="container page-shell district-page">
      {site.demo && <SampleNotice />}
      <div className="breadcrumb">
        <Link href="/">{kn.home}</Link>
        <span>/</span>
        <Link href="/districts">{t.districtNews}</Link>
        <span>/</span>
        {name}
      </div>
      {district.cover_url && (
        <div className="district-cover">
          <Image
            src={district.cover_url}
            alt=""
            fill
            priority
            sizes="(max-width: 1200px) 100vw, 1200px"
          />
        </div>
      )}
      <div className="discovery-heading">
        <div>
          <span className="eyebrow">
            {kn.karnataka} <span>•</span> {kn.district}
          </span>
          <h1>{name}</h1>
          <p>{description || t.districtNewsIntro}</p>
          <span className="meta">
            {results.total} {kn.news}
          </span>
        </div>
        <FollowButton targetType="place" targetId={district.id} label={name} />
      </div>
      <AdSlot placement="district-top" />
      {firstPage && lead && (
        <div className="lead-grid">
          <HeroStory post={lead} />
          <aside className="latest-panel">
            <SectionTitle>{t.districtLatest}</SectionTitle>
            {recent
              .filter((post) => post.id !== lead.id)
              .slice(0, 4)
              .map((post) => (
                <NewsCard key={post.id} post={post} compact />
              ))}
            <AdSlot placement="district-sidebar" format="rectangle" />
          </aside>
        </div>
      )}
      {firstPage && (
        <CategoryScrollShowcase
          posts={recent}
          categories={categories}
          title={name + " · " + kn.categoryNews}
          minItems={1}
          newsQuery={new URLSearchParams(filters).toString()}
        />
      )}
      {firstPage && (
        <BusinessAdShelf
          ads={shops}
          title={name + " · " + advertisingCopy(locale).shelfTitle}
        />
      )}
      <section className="section">
        <SectionTitle
          href={"/news?" + new URLSearchParams(filters).toString()}
          label={kn.allNews}
        >
          {t.districtAllNews}
        </SectionTitle>
        {results.rows.length ? (
          <div className="news-grid">
            {results.rows.map((post) => (
              <NewsCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={t.noDistrictNews}
            description={t.districtNewsIntro}
          />
        )}
        <Pagination page={results.page} pages={results.pages} />
      </section>
      {towns.length > 0 && (
        <section className="section">
          <SectionTitle>{t.districtTowns}</SectionTitle>
          <div className="category-chips">
            {towns.map((town) => (
              <Link className="chip" href={"/place/" + town.slug} key={town.id}>
                {districtName(locale, town)}
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className="section">
        <SectionTitle href="/districts" label={t.allDistricts}>
          {t.otherDistricts}
        </SectionTitle>
        <div className="category-chips">
          {districts
            .filter((other) => other.id !== district.id)
            .map((other) => (
              <Link
                className="chip"
                href={"/districts/" + other.slug}
                key={other.id}
              >
                {districtName(locale, other)}
              </Link>
            ))}
        </div>
      </section>
      <AdSlot placement="district-bottom" />
    </div>
  );
}
