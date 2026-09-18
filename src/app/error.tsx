"use client";
import { useUiStrings } from "@/components/i18n/LanguageProvider";

export default function ErrorPage({ reset }: { reset: () => void }) {
  const { kn } = useUiStrings();

  return (
    <div className="container page-shell">
      <div className="empty-state">
        <h1>{kn.error}</h1>
        <p>{kn.errorText}</p>
        <button className="button button-ember" onClick={reset}>
          {kn.retry}
        </button>
      </div>
    </div>
  );
}
