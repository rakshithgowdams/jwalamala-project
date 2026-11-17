"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";

/** A Delete button that asks once more before calling `action`, then refreshes the page. */
export function ConfirmDeleteButton({
  action,
  label,
}: {
  action: () => Promise<{ ok?: boolean; error?: string }>;
  label?: string;
}) {
  const { tr, kn, l } = useUiStrings();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!confirming)
    return (
      <span className="delete-post">
        <button type="button" className="button button-danger is-compact" onClick={() => setConfirming(true)}>
          <Trash2 size={15} aria-hidden="true" />
          {label || tr({ en: "Delete", kn: "ಅಳಿಸಿ", hi: "हटाएँ" })}
        </button>
      </span>
    );
  return (
    <span className="delete-post is-confirming" role="group">
      <span className="delete-post-question">
        {tr({ en: "Delete permanently?", kn: "ಶಾಶ್ವತವಾಗಿ ಅಳಿಸಬೇಕೇ?", hi: "स्थायी रूप से हटाएँ?" })}
      </span>
      <button
        type="button"
        className="button button-danger is-compact"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const result = await action();
            if (result.error) setError(l(result.error));
            else router.refresh();
          } catch {
            setError(kn.unavailable);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy
          ? tr({ en: "Deleting…", kn: "ಅಳಿಸಲಾಗುತ್ತಿದೆ…", hi: "हटाया जा रहा है…" })
          : tr({ en: "Yes, delete", kn: "ಹೌದು, ಅಳಿಸಿ", hi: "हाँ, हटाएँ" })}
      </button>
      <button
        type="button"
        className="button button-outline is-compact"
        disabled={busy}
        onClick={() => {
          setConfirming(false);
          setError("");
        }}
      >
        {tr({ en: "Cancel", kn: "ರದ್ದು", hi: "रद्द करें" })}
      </button>
      {error && (
        <span className="delete-post-error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
