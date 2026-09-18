"use client";
import { useUiStrings } from "@/components/i18n/LanguageProvider";

import { Captcha } from "@/components/forms/Captcha";
import { useState } from "react";

export function CommunityForm({
  kind,
  targetId,
  title,
}: {
  kind: "notice" | "opportunity" | "condolence";
  targetId?: string;
  title?: string;
}) {
  const { kn, v4: t } = useUiStrings();

  const [reset, setReset] = useState(0);
  const [token, setToken] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  return (
    <form
      className="v4-form"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setMessage("");
        const fields = Object.fromEntries(new FormData(event.currentTarget));
        try {
          const response = await fetch("/api/community/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...fields,
              kind,
              token,
              ...(kind === "condolence"
                ? {
                    target_id: targetId,
                    type: "condolence",
                    title_kn: title,
                    date: new Date().toISOString().slice(0, 10),
                  }
                : {}),
            }),
          });
          setMessage(response.ok ? kn.submitted : t.failed);
          setToken("");
          setReset((r) => r + 1);
        } catch {
          setMessage(t.failed);
        } finally {
          setBusy(false);
        }
      }}
    >
      {!key && <p className="notice">{kn.unavailable}</p>}
      {kind !== "condolence" && (
        <label className="field">
          {kn.title}
          <input name="title_kn" required maxLength={200} />
        </label>
      )}
      <label className="field">
        {kn.name}
        <input name="name" required maxLength={100} autoComplete="name" />
      </label>
      {kind === "opportunity" && (
        <label className="field">
          {t.organization}
          <input name="org" required maxLength={200} />
        </label>
      )}
      <label className="field">
        {kn.email}
        <input name="email" type="email" required autoComplete="email" />
      </label>
      {kind !== "condolence" && (
        <>
          <label className="field">
            {t.contentType}
            <select name="type">
              {(kind === "notice"
                ? [
                    ["amantrana", t.notices],
                    ["shraddhanjali", t.obituary],
                    ["student_achievement", t.scholarship],
                    ["abhinandane", t.approved],
                  ]
                : [
                    ["job", t.job],
                    ["scholarship", t.scholarship],
                    ["competition", t.competition],
                    ["admission", t.admission],
                  ]
              ).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {kind === "notice" ? kn.eventDate : t.deadline}
            <input name="date" type="date" required />
          </label>
        </>
      )}
      <label className="field">
        {kn.message}
        <textarea name="body_kn" maxLength={5000} required rows={6} />
      </label>
      <label className="field">
        {kn.link}
        <input type="url" name="link" />
      </label>
      <div hidden>
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Captcha onToken={setToken} reset={reset} />
      <button className="button button-ember" disabled={!key || !token || busy}>
        {busy ? kn.submitting : kn.submit}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
