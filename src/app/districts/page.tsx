import Link from "next/link";
import { getUiStrings } from "@/lib/i18n/server";
import { pickText } from "@/lib/i18n/content";
import { getPosts } from "@/lib/queries/content";
import { getV4Rows } from "@/lib/v4/queries";
import { site } from "@/config/site";
import { HeroStory, NewsCard } from "@/components/news/NewsCard";
import { AdSlot } from "@/components/ads/AdSlot";
import { SampleNotice, SectionTitle } from "@/components/ui/Primitives";
import {
  DistrictDirectory,
  type DistrictTile,
} from "@/components/discovery/DistrictDirectory";
import {
  districtName,
  listDistricts,
  postsInDistrict,
} from "@/lib/utils/districts";

export async function generateMetadata() {
  const { v4: t } = await getUiStrings();
  return {
    title: t.districtNews,
    description: t.districtNewsIntro,
    alternates: { canonical: "/districts" },
  };
}

export default async function DistrictsPage() {
  const { kn, v4: t, locale } = await getUiStrings();
  const [places, posts] = await Promise.all([getV4Rows("places"), getPosts()]);
  const districts = listDistricts(places, locale);
  const listed = new Set<string>();
  const tiles: DistrictTile[] = districts.map((district) => {
    const news = postsInDistrict(posts, places, district);
    for (const post of news) listed.add(post.id);
    const latest = news[0];
    return {
      slug: district.slug,
      name: districtName(locale, district),
      altName:
        locale === "kn"
          ? district.name_en
          : district.name_kn !== districtName(locale, district)
            ? district.name_kn
            : "",
      search: [
        district.name_kn,
        district.name_en,
        district.name_hi,
        district.slug,
      ]
        .filter(Boolean)
        .join(" ")
        .normalize("NFKC")
        .toLocaleLowerCase(),
      count: news.length,
      headline: latest
        ? pickText(locale, latest.title_kn, latest.title_en, latest.title_hi)
        : "",
      cover: district.cover_url || latest?.thumbnail_url || null,
    };
  });
  const districtPosts = posts.filter((post) => listed.has(post.id));
  const lead =
    districtPosts.find((post) => post.is_featured) || districtPosts[0];
  return (
    <div className="container page-shell district-page">
      {site.demo && <SampleNotice />}
      <div className="breadcrumb">
        <Link href="/">{kn.home}</Link>
        <span>/</span>
        {t.districtNews}
      </div>
      <div className="discovery-heading">
        <div>
          <span className="eyebrow">{kn.karnataka}</span>
          <h1>{t.districtNews}</h1>
          <p>{t.districtNewsIntro}</p>
        </div>
      </div>
      <AdSlot placement="districts-top" />
      {lead && (
        <div className="lead-grid">
          <HeroStory post={lead} />
          <aside className="latest-panel">
            <SectionTitle href="/news" label={kn.allNews}>
              {kn.latest}
            </SectionTitle>
            {districtPosts
              .filter((post) => post.id !== lead.id)
              .slice(0, 4)
              .map((post) => (
                <NewsCard key={post.id} post={post} compact />
              ))}
            <AdSlot placement="districts-sidebar" format="rectangle" />
          </aside>
        </div>
      )}
      <DistrictDirectory districts={tiles} />
      <AdSlot placement="districts-bottom" />
    </div>
  );
}
