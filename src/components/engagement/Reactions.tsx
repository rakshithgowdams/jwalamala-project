"use client";
import { useUiStrings } from "@/components/i18n/LanguageProvider";

import { useState, useEffect } from "react";

export function Reactions({ postId, demo }: { postId: string; demo: boolean }) {
  const { v4: t } = useUiStrings();

  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    if (demo) return;
    const controller = new AbortController();
    void fetch("/api/reactions?post=" + encodeURIComponent(postId), {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) =>
        setCounts(
          Object.fromEntries(
            (data.counts || []).map((r: { kind: string; count: number }) => [
              r.kind,
              Number(r.count),
            ]),
          ),
        ),
      )
      .catch(() => {});
    return () => controller.abort();
  }, [postId, demo]);
  const [selected, setSelected] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <section aria-label={t.reactions} className="reactions">
      <h2>{t.reactions}</h2>
      <div className="article-actions">
        {[
          ["namana", "🙏", t.namana],
          ["useful", "👍", t.useful],
          ["sad", "😢", t.sad],
        ].map(([kind, icon, label]) => (
          <button
            key={kind}
            className="button button-outline"
            aria-pressed={selected === kind}
            disabled={busy || !!selected}
            onClick={async () => {
              setBusy(true);
              try {
                if (!demo) {
                  const r = await fetch("/api/reactions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ post_id: postId, kind }),
                  });
                  if (!r.ok) throw Error();
                }
                setSelected(kind);
                setCounts((c) => ({ ...c, [kind]: (c[kind] || 0) + 1 }));
                setMessage(demo ? t.localOnly : t.thankYou);
              } catch {
                setMessage(t.failed);
              } finally {
                setBusy(false);
              }
            }}
          >
            {icon} {label} {counts[kind] || 0}
          </button>
        ))}
      </div>
      <p role="status">{message}</p>
    </section>
  );
}
