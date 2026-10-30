"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { deletePost, trashPost } from "@/app/admin/actions";

/** Moves an article to the recycle bin, or permanently deletes one that is already there. */
export function DeletePostButton({
  postId,
  title,
  afterDelete = "refresh",
  compact = false,
  mode = "bin",
}: {
  postId: string;
  title: string;
  /** "list" leaves the editor for the article list; "bin" opens the recycle bin; "refresh" reloads. */
  afterDelete?: "refresh" | "list" | "bin";
  compact?: boolean;
  /** "bin" keeps the article. "forever" removes it after a confirmation popup. */
  mode?: "bin" | "forever";
}) {
  const { tr, kn, l } = useUiStrings();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!confirming) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) setConfirming(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirming, busy]);

  function finish() {
    if (afterDelete === "list") router.replace("/admin/posts");
    else if (afterDelete === "bin") router.replace("/admin/posts/bin");
    else router.refresh();
  }

  async function moveToBin() {
    setBusy(true);
    setError("");
    try {
      const result = await trashPost(postId);
      if (result.error) {
        setError(l(result.error));
        return;
      }
      finish();
    } catch {
      setError(kn.unavailable);
    } finally {
      setBusy(false);
    }
  }

  async function removeForever() {
    setBusy(true);
    setError("");
    try {
      const result = await deletePost(postId);
      if (result.error) {
        setError(l(result.error));
        return;
      }
      setConfirming(false);
      finish();
    } catch {
      setError(kn.unavailable);
    } finally {
      setBusy(false);
    }
  }

  const label = compact
    ? tr({
        en: mode === "forever" ? `Delete "${title}" permanently` : `Move "${title}" to the recycle bin`,
        kn: mode === "forever" ? `"${title}" ಶಾಶ್ವತವಾಗಿ ಅಳಿಸಿ` : `"${title}" ಮರುಬಳಕೆ ಡಬ್ಬಿಗೆ ಸೇರಿಸಿ`,
        hi: mode === "forever" ? `"${title}" स्थायी रूप से हटाएँ` : `"${title}" रीसायकल बिन में भेजें`,
      })
    : undefined;

  return (
    <span className="delete-post">
      <button
        type="button"
        className={"button button-danger" + (compact ? " is-compact" : "")}
        disabled={busy}
        aria-label={label}
        onClick={() => (mode === "forever" ? setConfirming(true) : moveToBin())}
      >
        <Trash2 size={compact ? 15 : 16} aria-hidden="true" />
        {compact
          ? null
          : busy
            ? tr({ en: "Moving…", kn: "ಸೇರಿಸಲಾಗುತ್ತಿದೆ…", hi: "भेजा जा रहा है…" })
            : mode === "forever"
              ? tr({ en: "Delete permanently", kn: "ಶಾಶ್ವತವಾಗಿ ಅಳಿಸಿ", hi: "स्थायी रूप से हटाएँ" })
              : tr({ en: "Move to recycle bin", kn: "ಮರುಬಳಕೆ ಡಬ್ಬಿಗೆ ಸೇರಿಸಿ", hi: "रीसायकल बिन में भेजें" })}
      </button>
      {error && !confirming ? (
        <span className="delete-post-error" role="alert">
          {error}
        </span>
      ) : null}
      {confirming && typeof document !== "undefined"
        ? createPortal(
            <div className="delete-dialog-backdrop" onClick={() => !busy && setConfirming(false)}>
              <div
                className="delete-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="permanent-delete-title"
                onClick={(event) => event.stopPropagation()}
              >
                <h2 id="permanent-delete-title">
                  {tr({
                    en: "Are you sure you want to delete this permanently?",
                    kn: "ಇದನ್ನು ಶಾಶ್ವತವಾಗಿ ಅಳಿಸಲು ಖಚಿತವೇ?",
                    hi: "क्या आप इसे स्थायी रूप से हटाना चाहते हैं?",
                  })}
                </h2>
                <p>{title}</p>
                {error ? (
                  <p className="delete-post-error" role="alert">
                    {error}
                  </p>
                ) : null}
                <div className="delete-dialog-actions">
                  <button type="button" className="button button-outline" disabled={busy} onClick={() => setConfirming(false)}>
                    {tr({ en: "Cancel", kn: "ರದ್ದು", hi: "रद्द करें" })}
                  </button>
                  <button type="button" className="button button-danger" disabled={busy} onClick={removeForever}>
                    {busy
                      ? tr({ en: "Deleting…", kn: "ಅಳಿಸಲಾಗುತ್ತಿದೆ…", hi: "हटाया जा रहा है…" })
                      : tr({ en: "Delete permanently", kn: "ಶಾಶ್ವತವಾಗಿ ಅಳಿಸಿ", hi: "स्थायी रूप से हटाएँ" })}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
