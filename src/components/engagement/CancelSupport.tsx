"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
export function CancelSupport({ id, status }: { id: string; status: string }) {
  const { kn } = useUiStrings();
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <section className="utility-panel">
      <p>
        {kn.membership}: {status}
      </p>
      <p>{kn.cancelSupportNote}</p>
      {!confirm ? (
        <button
          className="button button-outline"
          onClick={() => setConfirm(true)}
        >
          {kn.cancelRenewal}
        </button>
      ) : (
        <button
          className="button button-ember"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await fetch("/api/support/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
              });
              setMessage(r.ok ? kn.renewalCancelled : kn.cancelFailed);
              if (r.ok) router.refresh();
            } catch {
              setMessage(kn.connectionError);
            } finally {
              setBusy(false);
            }
          }}
        >
          {kn.confirmStopPayments}
        </button>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
