"use client";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { intlLocale } from "@/lib/i18n/content";
import { removeDownload, storageUsed } from "@/lib/pwa/offline";
import { useDownloads } from "@/lib/pwa/hooks";

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

export function DownloadsList() {
  const { kn, locale } = useUiStrings();
  const rows = useDownloads();
  const [used, setUsed] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    void storageUsed().then((bytes) => {
      if (alive) setUsed(bytes);
    });
    return () => {
      alive = false;
    };
  }, [rows]);

  if (!rows) return null;
  if (!rows.length) return <p className="empty-state">{kn.downloadsEmpty}</p>;
  const date = new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return (
    <>
      {used !== null && (
        <p className="meta downloads-usage">
          {kn.storageUsedLabel}: {formatBytes(used)}
        </p>
      )}
      <ul className="downloads-list">
        {rows.map((row) => (
          <li key={row.url} className="download-row">
            {/* Plain links: offline, a full page load is what the service worker can answer. */}
            <a href={row.url} className="download-link">
              {row.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.image} alt="" width={96} height={64} loading="lazy" />
              ) : null}
              <span>
                <strong>{row.title}</strong>
                {row.summary ? <span className="download-summary">{row.summary}</span> : null}
                <time className="meta" dateTime={new Date(row.savedAt).toISOString()}>
                  {date.format(row.savedAt)}
                </time>
              </span>
            </a>
            <button
              type="button"
              className="icon-button"
              aria-label={kn.removeDownload + ": " + row.title}
              title={kn.removeDownload}
              onClick={() => void removeDownload(row.url)}
            >
              <Trash2 size={18} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
