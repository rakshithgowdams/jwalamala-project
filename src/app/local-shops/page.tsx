import Link from "next/link";
import { getUiStrings } from "@/lib/i18n/server";
import { getV4Rows } from "@/lib/v4/queries";
import { getBusinessAds } from "@/lib/ads/business-server";
import { businessCategories } from "@/lib/ads/business";
import { advertisingCopy } from "@/content/advertising";
import { site } from "@/config/site";
import { BusinessAdGrid } from "@/components/ads/BusinessAds";
import { EmptyState, SampleNotice } from "@/components/ui/Primitives";
import { districtName, listDistricts } from "@/lib/utils/districts";

type Props = {
  searchParams: Promise<{ district?: string; category?: string }>;
};

export async function generateMetadata() {
  const { locale } = await getUiStrings();
  const copy = advertisingCopy(locale);
  return {
    title: copy.directoryTitle,
    description: copy.directoryIntro,
    alternates: { canonical: "/local-shops" },
  };
}

export default async function LocalShopsPage({ searchParams }: Props) {
  const [{ kn, locale }, filters, places, ads] = await Promise.all([
    getUiStrings(),
    searchParams,
    getV4Rows("places"),
    getBusinessAds(),
  ]);
  const copy = advertisingCopy(locale);
  const districts = listDistricts(places, locale, { includeHidden: true });
  const district = districts.find((d) => d.slug === filters.district);
  const category = businessCategories.find((c) => c === filters.category);
  const shown = ads
    .filter(
      (ad) =>
        (!district || ad.district === district.district) &&
        (!category || ad.category === category),
    )
    .sort((a, b) => b.priority - a.priority);
  return (
    <div className="container page-shell">
      {site.demo && <SampleNotice />}
      <div className="breadcrumb">
        <Link href="/">{kn.home}</Link>
        <span>/</span>
        {copy.shelfTitle}
      </div>
      <div className="discovery-heading">
        <div>
          <span className="eyebrow">{copy.sponsored}</span>
          <h1>{copy.directoryTitle}</h1>
          <p>{copy.directoryIntro}</p>
        </div>
        <Link href="/advertise#apply" className="button button-ember">
          {copy.advertiseShop}
        </Link>
      </div>
      <form className="public-filter business-filter" action="/local-shops">
        <label className="field">
          {kn.district}
          <select name="district" defaultValue={district?.slug || ""}>
            <option value="">{copy.allDistricts}</option>
            {districts.map((d) => (
              <option key={d.id} value={d.slug}>
                {districtName(locale, d)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          {copy.businessType}
          <select name="category" defaultValue={category || ""}>
            <option value="">{copy.allTypes}</option>
            {businessCategories.map((c) => (
              <option key={c} value={c}>
                {copy.categories[c]}
              </option>
            ))}
          </select>
        </label>
        <button className="button button-outline">{copy.show}</button>
      </form>
      {shown.length ? (
        <BusinessAdGrid ads={shown} />
      ) : (
        <EmptyState title={copy.noShops} description={copy.directoryIntro} />
      )}
    </div>
  );
}
