"use client";
import { LiveMedia } from "./LiveMedia";
import { useUiStrings } from "@/components/i18n/LanguageProvider";

import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import type { LiveUpdate } from "@/lib/v4/types";

import { AdSlot } from "@/components/ads/AdSlot";
import { site } from "@/config/site";
export function LiveUpdates({
  blogId,
  updates,
  isLive,
}: {
  blogId: string;
  updates: LiveUpdate[];
  isLive: boolean;
}) {
  const { v4: t } = useUiStrings();

  const [visible, setVisible] = useState(updates),
    [pending, setPending] = useState<LiveUpdate[]>([]),
    [limit, setLimit] = useState(10),
    [error, setError] = useState("");
  useEffect(() => {
    if (!isLive || site.demo) return;
    const db = getBrowserClient();
    if (!db) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const response = await fetch(
          "/api/live/" + encodeURIComponent(blogId),
          { cache: "no-store" },
        );
        if (response.ok) {
          const data = (await response.json()) as { updates: LiveUpdate[] };
          if (!cancelled) setPending(data.updates);
        } else if (!cancelled) setError(t.failed);
      } catch {
        if (!cancelled) setError(t.failed);
      }
    };
    const channel = db
      .channel("liveblog:" + blogId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "liveblog_updates",
          filter: "liveblog_id=eq." + blogId,
        },
        () => void refresh(),
      )
      .subscribe();
    const timer = window.setInterval(() => void refresh(), 60000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      void db.removeChannel(channel);
    };
  }, [blogId, isLive, t.failed]);
  const ordered = [...visible].sort(
    (a, b) => Date.parse(b.published_at) - Date.parse(a.published_at),
  );
  const changed =
    pending.length > 0 && JSON.stringify(pending) !== JSON.stringify(visible);
  return (
    <section>
      {changed && (
        <button
          className="button button-ember live-refresh"
          onClick={() => {
            setVisible(pending);
            setPending([]);
            setError("");
          }}
        >
          {t.loadUpdates}
        </button>
      )}
      {error && <p role="status">{error}</p>}
      {ordered
        .filter((update) => update.is_pinned)
        .map((update) => (
          <div className="live-highlights" key={update.id}>
            <strong>{t.pinned}</strong>
            <LiveMedia media={update.media} />
            <div dangerouslySetInnerHTML={{ __html: update.body_html }} />
          </div>
        ))}
      {ordered.slice(0, limit).map((update, i) => (
        <div key={update.id}>
          <article className={"live-update " + (update.is_key ? "is-key" : "")}>
            <time dateTime={update.published_at}>
              {new Intl.DateTimeFormat("en-IN", {
                timeZone: "Asia/Kolkata",
                hour: "2-digit",
                minute: "2-digit",
                day: "numeric",
                month: "short",
              }).format(new Date(update.published_at))}
            </time>
            <LiveMedia media={update.media} />
            <div
              className="prose"
              dangerouslySetInnerHTML={{ __html: update.body_html }}
            />
          </article>
          {(i === 2 || i === 9) && <AdSlot placement={"live-update-" + i} />}
        </div>
      ))}
      {limit < visible.length && (
        <button
          className="button button-outline"
          onClick={() => setLimit(limit + 10)}
        >
          {t.more}
        </button>
      )}
    </section>
  );
}
