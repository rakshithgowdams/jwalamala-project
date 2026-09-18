"use client";
import { useEffect } from "react";
import { sourceBucket } from "@/lib/analytics/schema";
export function ArticlePulse({
  postId,
  demo,
}: {
  postId: string;
  demo: boolean;
}) {
  useEffect(() => {
    if (demo || navigator.doNotTrack === "1") return;
    let session: string;
    try {
      session =
        sessionStorage.getItem("jwalamala-pulse") || crypto.randomUUID();
      sessionStorage.setItem("jwalamala-pulse", session);
    } catch {
      return;
    }
    const source = sourceBucket(
        document.referrer,
        new URLSearchParams(location.search).get("utm_source") || "",
      ),
      device = matchMedia("(max-width:767px)").matches ? "mobile" : "desktop";
    let ticks = 0;
    const send = (
      event: "view" | "engaged" | "share" | "listen" | "video" | "push",
      seconds = 0,
    ) => {
      const range = document.documentElement.scrollHeight - innerHeight,
        percentage =
          range > 0 ? Math.min(100, Math.round((scrollY / range) * 100)) : 100,
        depth =
          percentage >= 100
            ? 100
            : percentage >= 75
              ? 75
              : percentage >= 50
                ? 50
                : percentage >= 25
                  ? 25
                  : 0;
      void fetch("/api/pulse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: postId,
          session,
          seconds,
          depth,
          event,
          source,
          device,
        }),
        keepalive: true,
      }).catch(() => {});
    };
    send("view");
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && ticks < 120) {
        ticks++;
        send("engaged", 15);
      }
    }, 15000);
    const onEvent = (event: Event) => {
      const kind = (event as CustomEvent).detail;
      if (["share", "listen", "video", "push"].includes(kind)) send(kind);
    };
    window.addEventListener("jwalamala-engagement", onEvent);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("jwalamala-engagement", onEvent);
    };
  }, [postId, demo]);
  return null;
}
