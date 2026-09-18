"use client";
import { useState } from "react";
import { applyContributor } from "@/app/account/contribute/actions";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { pickText } from "@/lib/i18n/content";
export function ContributorApplication({
  places,
  status,
}: {
  places: { id: string; name_kn: string; name_en?: string }[];
  status?: string;
}) {
  const { kn, locale } = useUiStrings();
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="v4-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        try {
          const r = await applyContributor(
            String(f.get("place")),
            String(f.get("note")),
          );
          setMessage(r.error || kn.applicationSent);
        } catch {
          setMessage(kn.submitFailed);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h1>{kn.contributorApplication}</h1>
      <p>{kn.contributorIntro}</p>
      {status && (
        <p>
          {kn.status}: {status}
        </p>
      )}
      <label className="field">
        {kn.reportingArea}
        <select name="place" required>
          {places.map((p) => (
            <option key={p.id} value={p.id}>
              {pickText(locale, p.name_kn, p.name_en)}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        {kn.yourExperience}
        <textarea name="note" required minLength={10} maxLength={2000} />
      </label>
      <button
        className="button button-ember"
        disabled={busy || status === "approved"}
      >
        {kn.applyNow}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
