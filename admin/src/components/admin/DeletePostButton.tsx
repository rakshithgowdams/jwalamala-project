"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { deletePost } from "@/app/admin/actions";

/** Delete with an inline second step, so one stray click never removes an article. */
export function DeletePostButton({
  postId,
  title,
  afterDelete = "refresh",
  compact = false,
}: {
  postId: string;
  title: string;
  /** "list" leaves the editor for the article list; "refresh" reloads the current list. */
  afterDelete?: "refresh" | "list";
  compact?: boolean;
}) {
  const { tr, kn, l } = useUiStrings();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true);
    setError("");
    try {
      const result = await deletePost(postId);
      if (result.error) {
        setError(l(result.error));
        return;
      }
      if (afterDelete === "list") router.replace("/admin/posts");
      else router.refresh();
    } catch {
      setError(kn.unavailable);
    } finally {
      setBusy(false);
    }
  }

  if (!confirming)
    return (
      <span className="delete-post">
        <button
          type="button"
          className={"button button-danger" + (compact ? " is-compact" : "")}
          onClick={() => setConfirming(true)}
          aria-label={compact ? tr({ en: `Delete "${title}"`, kn: `"${title}" ಅಳಿಸಿ`, hi: `"${title}" हटाएँ` }) : undefined}
        >
          <Trash2 size={compact ? 15 : 16} aria-hidden="true" />
          {compact ? null : tr({ en: "Delete article", kn: "ಲೇಖನ ಅಳಿಸಿ", hi: "लेख हटाएँ" })}
        </button>
      </span>
    );
  return (
    <span className="delete-post is-confirming" role="group">
      <span className="delete-post-question">
        {tr({ en: "Delete permanently?", kn: "ಶಾಶ್ವತವಾಗಿ ಅಳಿಸಬೇಕೇ?", hi: "स्थायी रूप से हटाएँ?" })}
      </span>
      <button type="button" className="button button-danger is-compact" disabled={busy} onClick={remove}>
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
