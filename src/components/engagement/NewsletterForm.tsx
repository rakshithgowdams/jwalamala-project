"use client";
import { useUiStrings } from "@/components/i18n/LanguageProvider";

import { useState } from "react";
import { Captcha } from "@/components/forms/Captcha";

export function NewsletterForm() {
  const { v4: t, kn } = useUiStrings();

  const [token, setToken] = useState(""),
    [reset, setReset] = useState(0),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <form
      className="v4-form utility-panel"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const f = new FormData(e.currentTarget);
        try {
          const response = await fetch("/api/newsletter/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: f.get("email"),
              frequency: f.get("frequency"),
              token,
            }),
          });
          setMessage(response.ok ? t.checkInbox : t.providerDisabled);
        } catch {
          setMessage(t.failed);
        } finally {
          setToken("");
          setReset((r) => r + 1);
          setBusy(false);
        }
      }}
    >
      <h2>{t.newsletter}</h2>
      <p>{t.newsletterHint}</p>
      <label className="field">
        {kn.email}
        <input
          type="email"
          name="email"
          required
          maxLength={254}
          autoComplete="email"
        />
      </label>
      <label className="field">
        {t.frequency}
        <select name="frequency">
          <option value="weekly">{t.weekly}</option>
          <option value="daily">{t.daily}</option>
        </select>
      </label>
      <Captcha onToken={setToken} reset={reset} />
      <button className="button button-ember" disabled={!token || busy}>
        {t.subscribe}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
