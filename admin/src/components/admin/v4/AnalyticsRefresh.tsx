"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { v4 as t } from "@/content/strings.kn";
export function AnalyticsRefresh() {
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
