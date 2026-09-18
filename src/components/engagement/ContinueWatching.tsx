"use client";
import Link from "next/link";
import { useLocalValue } from "@/lib/v4/local-store";
import { watchSchema, WATCH_KEY, type WatchItem } from "@/lib/v4/watch-history";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
const empty: WatchItem[] = [];
export function ContinueWatching() {
  const [rows, setRows] = useLocalValue(WATCH_KEY, watchSchema, empty);
  const { kn } = useUiStrings();
  if (!rows.length) return null;
  return (
    <section className="utility-panel">
      <div className="section-title">
        <h2>{kn.continueWatching}</h2>
        <button className="chip" onClick={() => setRows([])}>
          {kn.clear}
        </button>
      </div>
      {rows
        .filter((r) => r.seconds > 5)
        .slice(0, 6)
        .map((r) => (
          <Link className="directory-link" href={r.href} key={r.id}>
            {r.title} · {Math.floor(r.seconds / 60)}:
            {String(Math.floor(r.seconds % 60)).padStart(2, "0")}
          </Link>
        ))}
    </section>
  );
}
