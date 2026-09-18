"use client";
import { useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { AdSlot } from "./AdSlot";
import { routeAllowsAds } from "@/lib/ads/schema";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
export function MobileStickyAd() {
  const path = usePathname();
  return <Sticky key={path} path={path} />;
}
function Sticky({ path }: { path: string }) {
  const [closed, setClosed] = useState(false);
  const { kn } = useUiStrings();
  const dismissed = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return sessionStorage.getItem("jwalamala-sticky-dismissed") === "1";
      } catch {
        return false;
      }
    },
    () => false,
  );
  if (
    dismissed ||
    closed ||
    !routeAllowsAds(path) ||
    path.startsWith("/notices/")
  )
    return null;
  return (
    <aside className="mobile-sticky-ad">
      <button
        className="sticky-ad-close"
        aria-label={kn.closeAd}
        onClick={() => {
          setClosed(true);
          try {
            sessionStorage.setItem("jwalamala-sticky-dismissed", "1");
          } catch {}
        }}
      >
        ×
      </button>
      <AdSlot placement="global_mobile_sticky" />
    </aside>
  );
}
