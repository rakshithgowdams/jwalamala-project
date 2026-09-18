"use client";
import { useUiStrings } from "@/components/i18n/LanguageProvider";

import { useState } from "react";

export function NewsletterConfirm({
  token,
  mode,
}: {
  token: string;
  mode: "confirm" | "unsubscribe";
}) {
  const { v4: t } = useUiStrings();

  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false);
  return (
    <>
      <button
        className="button button-ember"
        disabled={busy || done}
        onClick={async () => {
          setBusy(true);
          try {
            const response = await fetch("/api/newsletter/" + mode, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token }),
            });
            setMessage(
              response.ok
                ? mode === "confirm"
                  ? t.subscriptionConfirmed
                  : t.unsubscribed
                : t.linkExpired,
            );
            setDone(response.ok);
          } catch {
            setMessage(t.failed);
          } finally {
            setBusy(false);
          }
        }}
      >
        {mode === "confirm" ? t.confirmNewsletter : t.unsubscribe}
      </button>
      <p role="status">{message}</p>
    </>
  );
}
