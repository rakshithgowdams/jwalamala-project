import { MobileStickyAd } from "@/components/ads/MobileStickyAd";
import { getSetting } from "@/lib/v4/settings";
import { adSettingsSchema, defaultAds } from "@/lib/ads/schema";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import { getUiStrings } from "@/lib/i18n/server";
import {
  brandName,
  brandDescription,
  brandParts,
  intlLocale,
} from "@/lib/i18n/content";
import { PlaceNamesProvider } from "@/components/i18n/PlaceNames";
import { getPlaceNames } from "@/lib/i18n/places-server";
import { getTheme } from "@/lib/theme/server";
import { AudioProvider } from "@/components/content/AudioPlayer";
import { ReaderSync } from "@/components/engagement/ReaderSync";
import { headers } from "next/headers";
import { AdNonceProvider } from "@/components/ads/AdSlot";
import type { Metadata, Viewport } from "next";
import "./fonts.css";
import { site } from "@/config/site";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/Navigation";
import { PwaControls } from "@/components/pwa/PwaControls";
import { SiteMotion } from "@/components/motion/SiteMotion";
import { ContentProtection } from "@/components/security/ContentProtection";import "./globals.css";
export async function generateMetadata(): Promise<Metadata> {
  const { locale, kn } = await getUiStrings();
  const brand = brandName(locale);
  const description = brandDescription(locale);
  return {
    metadataBase: new URL(site.url),
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
      other: process.env.BING_SITE_VERIFICATION
        ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
        : {},
    },
    title: { default: brand, template: `%s | ${brand}` },
    description,
    applicationName: brand,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: brandParts(locale).mark,
    },
    icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
    openGraph: {
      title: brand,
      description,
      locale: intlLocale(locale).replace("-", "_"),
      type: "website",
      images: [{ url: "/images/jwalamala-logo.jpg", width: 900, height: 900 }],
    },
    robots: site.demo
      ? { index: false, follow: false }
      : { index: true, follow: true, noarchive: true },
    publisher: brand,
    other: {
      copyright: `© ${new Date().getFullYear()} ${brand}. ${kn.rights}`,
      "dcterms.rightsHolder": brand,
    },
  };
}
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1F2447",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ads = adSettingsSchema
    .catch(defaultAds)
    .parse((await getSetting("ads")) || defaultAds);
  const { locale, kn } = await getUiStrings();
  const { preference, scheme } = await getTheme();
  const placeNames = await getPlaceNames();
  const nonce =
    process.env.ADS_STRICT_CSP === "true"
      ? (await headers()).get("x-nonce") || undefined
      : undefined;
  return (
    <html
      lang={locale}
      className="font-local"
      data-theme={preference === "system" ? scheme : preference}
    >
      <body data-print-message={kn.printBlocked}>
        <noscript>
          <style>
            {
              ".progressive-image{opacity:1!important}.image-skeleton{display:none!important}"
            }
          </style>
        </noscript>
        <LanguageProvider locale={locale}>
          <PlaceNamesProvider names={placeNames}>
            <AdNonceProvider nonce={nonce}>
              <AudioProvider>
                <a href="#main" className="skip-link">
                  {kn.skipContent}
                </a>
                <Header />
                <main id="main">{children}</main>
                <Footer />
                <BottomNav />
                {ads.enabled && ads.sticky_mobile_enabled && <MobileStickyAd />}
                <PwaControls />
                <ReaderSync />
                <SiteMotion />
                <ContentProtection />
              </AudioProvider>
            </AdNonceProvider>
          </PlaceNamesProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
