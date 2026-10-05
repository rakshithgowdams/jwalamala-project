import { getUiStrings } from "@/lib/i18n/server";
import { brandParts } from "@/lib/i18n/content";
import { LanguageSwitch } from "@/components/i18n/LanguageProvider";
import { WeatherChip } from "@/components/widgets/WeatherChip";
import { Suspense } from "react";
import { TrendingBar } from "@/components/discovery/TrendingBar";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Search, UserRound, Radio } from "lucide-react";
import { site } from "@/config/site";

import { formatDate, isoToday } from "@/lib/utils/dates";
import { BrandRibbon } from "./FlameGarland";
import { CategoryNav, ThemeToggle } from "./Navigation";
import { ScrollHeader } from "./ScrollHeader";
import { AccountLink } from "./AccountLink";
import { getCategories } from "@/lib/queries/content";
import { getTheme } from "@/lib/theme/server";
import { getV4Rows } from "@/lib/v4/queries";
import { districtName, listDistricts } from "@/lib/utils/districts";
export async function Header() {
  const { kn, locale } = await getUiStrings();
  const brand = brandParts(locale);
  // The ribbon runs from the mark's first "l" (ಲ / ल in the Indic spellings) to the end.
  const ribbonAt = Math.max(0, brand.mark.search(/[lಲल]/i));
  const { preference } = await getTheme();
  const [categories, places] = await Promise.all([
    getCategories(),
    getV4Rows("places").catch(() => []),
  ]);
  const districts = listDistricts(places, locale).map((district) => ({
    href: "/districts/" + district.slug,
    label: districtName(locale, district),
  }));
  return (
    <ScrollHeader>
      <div className="utility-bar">
        <div className="container utility-inner">
          <span>{kn.community}</span>
          <div>
            <Link href="/about">{kn.about}</Link>
            <Link href="/contact">{kn.contact}</Link>
            <Suspense
              fallback={
                <span
                  className="skeleton-block weather-loading"
                  aria-hidden="true"
                />
              }
            >
              <WeatherChip />
            </Suspense>
            <ThemeToggle preference={preference} />
            <LanguageSwitch />
          </div>
        </div>
      </div>
      <div className="container masthead">
        <Link href="/" className="brand" aria-label={brand.full}>
          <Image src={site.logo} alt="" width={92} height={92} priority />
          <div className="brand-text">
            <div className="wordmark">
              {brand.mark.slice(0, ribbonAt)}
              <span className="wordmark-tail">
                {brand.mark.slice(ribbonAt)}
                <span className="wordmark-suffix">{brand.suffix}</span>
                <BrandRibbon />
              </span>
            </div>
            <div className="brand-tagline">{kn.tagline}</div>
          </div>
        </Link>
        <div className="masthead-right">
          <span className="meta">{formatDate(isoToday(), false, locale)}</span>
          <div className="masthead-actions">
            <Link href="/search" className="icon-button" aria-label={kn.search}>
              <Search size={21} />
            </Link>
            <Suspense
              fallback={
                <Link
                  href="/login"
                  className="icon-button"
                  aria-label={kn.login}
                >
                  <UserRound size={21} />
                </Link>
              }
            >
              <AccountLink />
            </Suspense>
            <Link href="/videos?tab=live" className="button button-ember">
              <Radio size={17} />
              {kn.live}
            </Link>
          </div>
        </div>
      </div>
      <CategoryNav categories={categories} districts={districts} />
      <Suspense
        fallback={
          <div
            className="container skeleton-block trending-loading"
            aria-hidden="true"
          />
        }
      >
        <TrendingBar />
      </Suspense>
      <div className="container edition-line">
        <span>{kn.edition}</span>
        <Link href="/contact">
          {kn.sendNews}
          <ArrowUpRight size={15} />
        </Link>
      </div>
    </ScrollHeader>
  );
}
