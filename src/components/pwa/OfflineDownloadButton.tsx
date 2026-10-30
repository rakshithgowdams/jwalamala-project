"use client";
import { useRef, useState } from "react";
import { CircleCheck, Download, LoaderCircle } from "lucide-react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { pageKey, removeDownload, saveDownload } from "@/lib/pwa/offline";
import { useDownloads } from "@/lib/pwa/hooks";

export function OfflineDownloadButton({
  href,
  title,
  summary,
  image,
}: {
  href: string;
  title: string;
  summary?: string;
  image?: string;
}) {
  const { kn } = useUiStrings();
  const button = useRef<HTMLButtonElement>(null);
  const rows = useDownloads();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!rows) return null;
  const done = rows.some((row) => row.url === pageKey(href));
  return (
    <span className="offline-download">
      <button
        ref={button}
        type="button"
        className={"button button-outline" + (done ? " is-downloaded" : "")}
        aria-pressed={done}
        disabled={busy}
        title={done ? kn.removeDownload : kn.downloadOffline}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            if (done) await removeDownload(href);
            else
              await saveDownload(
                { url: href, title, summary: summary?.slice(0, 220), image },
                button.current?.closest("article") ?? null,
              );
          } catch {
            setError(kn.downloadFailed);
          }
          setBusy(false);
        }}
      >
        {busy ? (
          <LoaderCircle size={17} className="spin" aria-hidden="true" />
        ) : done ? (
          <CircleCheck size={17} aria-hidden="true" />
        ) : (
          <Download size={17} aria-hidden="true" />
        )}
        {busy ? kn.downloading : done ? kn.downloaded : kn.downloadOffline}
      </button>
      {error && (
        <span role="status" className="offline-download-error">
          {error}
        </span>
      )}
    </span>
  );
}
