"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
export function AnalyticsRefresh() {
  const { v4: t } = useUiStrings();
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30000);
    return () => clearInterval(timer);
  }, [router]);
  return (
    <button className="chip" onClick={() => router.refresh()}>
      {t.refresh}
    </button>
  );
}
