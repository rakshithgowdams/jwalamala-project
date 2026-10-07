"use client";
import { useUiStrings } from "@/components/i18n/LanguageProvider";

import { useState, useEffect, useRef, createContext, useContext } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

import { site } from "@/config/site";
import { pickText } from "@/lib/i18n/content";
import { routeAllowsAds, type AdPick } from "@/lib/ads/schema";
import { posterSizes, slotShape } from "@/lib/ads/posters";
export const AdNonceContext = createContext<string | undefined>(undefined);
export function AdNonceProvider({
  nonce,
  children,
}: {
  nonce?: string;
  children: React.ReactNode;
}) {
  return (
    <AdNonceContext.Provider value={nonce}>{children}</AdNonceContext.Provider>
  );
}
export function AdSlot({
  placement,
  format = "banner",
  disabled = false,
}: {
  placement: string;
  /** "wide" reserves a full-width 16:9 space; "banner" keeps the slimmer strip. */
  format?: "banner" | "rectangle" | "wide";
  disabled?: boolean;
}) {
  const pathname = usePathname();
  if (disabled || !routeAllowsAds(pathname)) return null;
  return (
    <Slot
      key={pathname + placement}
      placement={placement}
      format={format}
      pathname={pathname}
    />
  );
}
function Slot({
  placement,
  format,
  pathname,
}: {
  placement: string;
  format: string;
  pathname: string;
}) {
  const { kn, v4: t, locale } = useUiStrings();

  const root = useRef<HTMLDivElement>(null),
    [pick, setPick] = useState<AdPick>(
      site.demo ? { mode: "test" } : { mode: "off" },
    ),
    [ready, setReady] = useState(false),
    [unfilled, setUnfilled] = useState(false);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let active = true;
    const controller = new AbortController();
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        setReady(true);
        const params = new URLSearchParams({
          placement,
          path: pathname,
          device: matchMedia("(max-width:767px)").matches
            ? "mobile"
            : "desktop",
          format,
        });
        void fetch("/api/ads/pick?" + params, {
          signal: controller.signal,
          cache: "no-store",
        })
          .then((r) => (r.ok ? r.json() : { mode: "off" }))
          .then((value: AdPick) => {
            if (active) setPick(value);
          })
          .catch(() => {});
      },
      { rootMargin: "200px" },
    );
    observer.observe(element);
    return () => {
      active = false;
      controller.abort();
      observer.disconnect();
    };
  }, [pathname, placement, format]);
  useEffect(() => {
    if (pick.mode !== "manual" || !root.current) return;
    let timer: ReturnType<typeof setTimeout> | undefined,
      recorded = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].intersectionRatio >= 0.5 && !recorded) {
          timer = setTimeout(() => {
            recorded = true;
            void fetch("/api/ads/impression", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: pick.creative.token }),
              keepalive: true,
            });
            observer.disconnect();
          }, 1000);
        } else if (timer) clearTimeout(timer);
      },
      { threshold: [0.5] },
    );
    observer.observe(root.current);
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [pick]);
  const empty = (ready && pick.mode === "off") || unfilled;
  const shape = slotShape(placement, format);
  const poster =
    pick.mode === "manual" && pick.creative.shape !== "any"
      ? pick.creative.shape
      : null;
  const alt =
    pick.mode === "manual"
      ? pickText(
          locale,
          pick.creative.alt_kn,
          pick.creative.alt_en,
          pick.creative.alt_hi,
        )
      : "";
  const image =
    pick.mode !== "manual" ? null : poster ? (
      // Upload already crops and compresses posters to their exact size.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className="ad-poster"
        src={pick.creative.image_url}
        alt={alt}
        loading="lazy"
        width={posterSizes[poster].width}
        height={posterSizes[poster].height}
      />
    ) : (
      <picture>
        {pick.creative.mobile_image_url && (
          <source
            media="(max-width:767px)"
            srcSet={pick.creative.mobile_image_url}
          />
        )}
        <img
          src={pick.creative.image_url}
          alt={alt}
          loading="lazy"
          width={format === "rectangle" ? 300 : 728}
          height={format === "rectangle" ? 250 : 90}
        />
      </picture>
    );
  return (
    <div
      ref={root}
      className={
        "ad-slot ad-slot--" +
        format +
        (poster ? " ad-slot--poster-" + poster : "") +
        (empty ? " ad-slot--empty" : "")
      }
      data-ad-placement={placement}
      role="region"
      aria-label={kn.advertisement}
    >
      {!empty && (
        <>
          <span className="ad-slot-label">
            {pick.mode === "manual" ? t.sponsored : kn.advertisement}
          </span>
          {pick.mode === "manual" ? (
            pick.creative.linked ? (
              <a
                href={
                  "/api/ads/click/" +
                  pick.creative.id +
                  "?token=" +
                  encodeURIComponent(pick.creative.token)
                }
                target="_blank"
                rel="sponsored noopener"
              >
                {image}
              </a>
            ) : (
              image
            )
          ) : pick.mode === "google" ? (
            <GoogleAd value={pick} onEmpty={() => setUnfilled(true)} />
          ) : (
            <div className="ad-slot-placeholder">
              <span lang="en">Google AdSense</span>
              <span>{kn.adSpace}</span>
              {shape !== "strip" && (
                <span className="ad-slot-size" lang="en">
                  {shape === "square" ? "1:1" : "16:9"} ·{" "}
                  {posterSizes[shape].width}×{posterSizes[shape].height}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
function GoogleAd({
  value,
  onEmpty,
}: {
  value: Extract<AdPick, { mode: "google" }>;
  onEmpty: () => void;
}) {
  const nonce = useContext(AdNonceContext),
    element = useRef<HTMLModElement>(null),
    pushed = useRef(false),
    [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!loaded || !element.current || pushed.current) return;
    pushed.current = true;
    const win = window as Window & { adsbygoogle?: Record<string, never>[] };
    try {
      (win.adsbygoogle = win.adsbygoogle || []).push({});
    } catch {
      return;
    }
    const observer = new MutationObserver(() => {
      if (element.current?.getAttribute("data-ad-status") === "unfilled")
        onEmpty();
    });
    observer.observe(element.current, {
      attributes: true,
      attributeFilter: ["data-ad-status"],
    });
    return () => observer.disconnect();
  }, [loaded, onEmpty]);
  return (
    <>
      <Script
        id="jwalamala-adsense"
        nonce={nonce}
        src={
          "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" +
          value.client
        }
        crossOrigin="anonymous"
        strategy="afterInteractive"
        onReady={() => setLoaded(true)}
      />
      <ins
        ref={element}
        className="adsbygoogle"
        style={{ display: "block", width: "100%" }}
        data-ad-client={value.client}
        data-ad-slot={value.slot}
        data-ad-format={value.format === "in-article" ? "fluid" : value.format}
        data-ad-layout={
          value.format === "in-article" ? "in-article" : undefined
        }
        data-full-width-responsive="true"
      />
    </>
  );
}
