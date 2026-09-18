"use client";
import { useState } from "react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
export function ApproveSponsor({
  token,
  approved,
}: {
  token: string;
  approved: boolean;
}) {
  const { kn } = useUiStrings();
  const [done, setDone] = useState(approved),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section className="utility-panel">
      {done ? (
        <p>{kn.sponsorApproved}</p>
      ) : (
        <>
          <p>{kn.sponsorApprovalIntro}</p>
          <button
            className="button button-ember"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await fetch("/api/sponsor/approve", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ token }),
                });
                if (r.ok) setDone(true);
                else setMessage(kn.sponsorLinkExpired);
              } catch {
                setMessage(kn.connectionError);
              } finally {
                setBusy(false);
              }
            }}
          >
            {kn.approveVersion}
          </button>
        </>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
