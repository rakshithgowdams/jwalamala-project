"use client";
import { useEffect, useRef, type CSSProperties } from "react";
import Link from "next/link";
import { ExternalLink, MapPin, MessageCircle, Phone } from "lucide-react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { ProgressiveImage as Image } from "@/components/ui/ProgressiveImage";
import { SectionTitle } from "@/components/ui/Primitives";
import { pickText } from "@/lib/i18n/content";
import { formatDate } from "@/lib/utils/dates";
import { advertisingCopy } from "@/content/advertising";
import { telHref, whatsappHref, type BusinessAdView } from "@/lib/ads/business";

type CardStyle = CSSProperties & { [key: `--${string}`]: string };
const PALETTE = [
  "var(--vivid-1)",
  "var(--vivid-4)",
  "var(--vivid-3)",
  "var(--vivid-2)",
  "var(--vivid-5)",
  "var(--vivid-6)",
];

function record(id: string, kind: "impression" | "click") {
  // Sample shops have no database row to count against.
  if (id.startsWith("sample-")) return;
  void fetch("/api/business-ads/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, kind }),
    keepalive: true,
  }).catch(() => {});
}

function firstGrapheme(text: string, locale: string) {
  const segments = new Intl.Segmenter(locale, { granularity: "grapheme" });
  return segments.segment(text.trim())[Symbol.iterator]().next().value?.segment;
}

export function BusinessAdCard({
  ad,
  accent = PALETTE[0],
}: {
  ad: BusinessAdView;
  accent?: string;
}) {
  const { locale } = useUiStrings();
  const copy = advertisingCopy(locale);
  const root = useRef<HTMLElement>(null);
  const name = pickText(locale, ad.name_kn, ad.name_en, ad.name_hi);
  const offer = pickText(locale, ad.offer_kn, ad.offer_en, ad.offer_hi);
  const place = ad.place
    ? pickText(locale, ad.place.name_kn, ad.place.name_en, ad.place.name_hi)
    : "";
  const until = new Date(ad.ends_at).toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  // Counted like the banner slots: half the card on screen for a full second.
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].intersectionRatio >= 0.5) {
          timer = setTimeout(() => {
            record(ad.id, "impression");
            observer.disconnect();
          }, 1000);
        } else if (timer) clearTimeout(timer);
      },
      { threshold: [0.5] },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [ad.id]);
  const click = () => record(ad.id, "click");
  return (
    <article
      ref={root}
      className="business-ad"
      style={{ "--row-accent": accent } as CardStyle}
    >
      <span className="business-ad-label">{copy.sponsored}</span>
      <div className="business-ad-media" aria-hidden="true">
        {ad.image_url ? (
          <Image src={ad.image_url} alt="" fill sizes="280px" />
        ) : (
          <span className="business-ad-monogram">
            {firstGrapheme(name, locale)}
          </span>
        )}
      </div>
      <div className="business-ad-body">
        <span className="eyebrow">{copy.categories[ad.category]}</span>
        <h3>{name}</h3>
        {offer && <p>{offer}</p>}
        <div className="business-ad-meta">
          {place && (
            <span>
              <MapPin size={13} aria-hidden="true" />
              {place}
            </span>
          )}
          <span>
            {copy.validUntil}: {formatDate(until, false, locale)}
          </span>
        </div>
        <div className="business-ad-actions">
          {ad.phone && (
            <a
              href={telHref(ad.phone)}
              onClick={click}
              aria-label={copy.call + ": " + name}
            >
              <Phone size={15} aria-hidden="true" />
              {copy.call}
            </a>
          )}
          {ad.whatsapp && (
            <a
              href={whatsappHref(ad.whatsapp)}
              onClick={click}
              target="_blank"
              rel="sponsored noopener noreferrer"
              aria-label={copy.whatsapp + ": " + name}
            >
              <MessageCircle size={15} aria-hidden="true" />
              {copy.whatsapp}
            </a>
          )}
          {ad.website && (
            <a
              href={ad.website}
              onClick={click}
              target="_blank"
              rel="sponsored noopener noreferrer"
              aria-label={copy.website + ": " + name}
            >
              <ExternalLink size={15} aria-hidden="true" />
              {copy.website}
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

export function BusinessAdShelf({
  ads,
  title,
}: {
  ads: BusinessAdView[];
  title?: string;
}) {
  const { locale } = useUiStrings();
  const copy = advertisingCopy(locale);
  if (!ads.length) return null;
  return (
    <section className="business-shelf" aria-label={copy.sponsored}>
      <SectionTitle href="/local-shops" label={copy.allShops}>
        {title || copy.shelfTitle}
      </SectionTitle>
      <p className="business-shelf-note">
        {copy.sponsored} · <Link href="/advertise">{copy.advertiseShop}</Link>
      </p>
      <div className="business-track">
        {ads.map((ad, i) => (
          <BusinessAdCard
            key={ad.id}
            ad={ad}
            accent={PALETTE[i % PALETTE.length]}
          />
        ))}
      </div>
    </section>
  );
}

export function BusinessAdGrid({ ads }: { ads: BusinessAdView[] }) {
  return (
    <div className="business-grid">
      {ads.map((ad, i) => (
        <BusinessAdCard
          key={ad.id}
          ad={ad}
          accent={PALETTE[i % PALETTE.length]}
        />
      ))}
    </div>
  );
}
