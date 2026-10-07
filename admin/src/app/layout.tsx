import type { Metadata, Viewport } from "next";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import { PlaceNamesProvider } from "@/components/i18n/PlaceNames";
import { getUiStrings } from "@/lib/i18n/server";
import { brandName } from "@/lib/i18n/content";
import "./fonts.css";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getUiStrings();
  const brand = brandName(locale) + " Admin";
  return {
    title: { default: brand, template: `%s | ${brand}` },
    icons: { icon: "/icons/icon-192.png" },
    robots: { index: false, follow: false },
  };
}
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1F2447",
};

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale } = await getUiStrings();
  return (
    <html lang={locale} className="font-local" data-theme="light">
      <body>
        <LanguageProvider locale={locale}>
          <PlaceNamesProvider names={{}}>
            <main id="main">{children}</main>
          </PlaceNamesProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
