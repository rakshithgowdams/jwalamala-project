import { ChannelLinks } from "@/components/discovery/ChannelLinks";
import Link from "next/link";
import Image from "next/image";
import { site } from "@/config/site";
import { getUiStrings } from "@/lib/i18n/server";
import { brandName } from "@/lib/i18n/content";
import { FlameGarland } from "./FlameGarland";
export async function Footer() {
  const { kn, v4: t, locale } = await getUiStrings();
  const brand = brandName(locale);
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">
              <Image src={site.logo} width={58} height={58} alt="" />
              <h2>{brand}</h2>
            </div>
            <p>{kn.footerText}</p>
            <FlameGarland />
          </div>
          <div>
            <h3>{kn.explore}</h3>
            <Link href="/category/news">{kn.news}</Link>
            <Link href="/videos">{kn.videos}</Link>
            <Link href="/events">{kn.events}</Link>
            <Link href="/search">{kn.search}</Link>
          </div>
          <div>
            <h3>{kn.follow}</h3>
            <Link href="/support">{t.support}</Link>
            <Link href="/about">{kn.about}</Link>
            <Link href="/contact">{kn.sendNews}</Link>
            <Link href="/advertise">{kn.advertise}</Link>
            <Link href="/credits">{kn.imageCredit}</Link>
            <Link href="/login">{kn.login}</Link>
            <Link href="/signup">{kn.createAccount}</Link>
            <Link href="/auth/admin">{kn.admin}</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {brand}. {kn.rights}
          </span>
          <div>
            <Link href="/privacy">{kn.privacy}</Link>
            <Link href="/terms">{kn.terms}</Link>
            <Link href="/disclaimer">{kn.disclaimer}</Link>
          </div>
          <span>{kn.madeBy}</span>
        </div>
      </div>
      <div className="container">
        <ChannelLinks />
        <div className="footer-links">
          <Link href="/editorial-policy">{t.editorialPolicy}</Link>
          <Link href="/fact-check-policy">{t.factCheckPolicy}</Link>
          <Link href="/ownership">{t.ownership}</Link>
          <Link href="/corrections">{t.corrections}</Link>
          <Link href="/newsletter">{t.newsletter}</Link>
        </div>
      </div>
    </footer>
  );
}
