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
import { FlameGarland } from "./FlameGarland";
import { CategoryNav, ThemeToggle } from "./Navigation";
import { ScrollHeader } from "./ScrollHeader";
import { AccountLink } from "./AccountLink";
import { getCategories } from "@/lib/queries/content";
import { getTheme } from "@/lib/theme/server";
export async function Header() {
  const { kn, locale } = await getUiStrings();
  const brand = brandParts(locale);
  const { preference } = await getTheme();
  const categories = await getCategories();
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
          <div>
            <div className="wordmark">
              {brand.mark}
              <span>{brand.suffix}</span>
            </div>
            <div className="brand-tagline">
              {kn.tagline}
              <FlameGarland />
            </div>
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
      <CategoryNav categories={categories} />
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
