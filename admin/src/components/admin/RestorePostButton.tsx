"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { restorePost } from "@/app/admin/actions";

export function RestorePostButton({ postId, title }: { postId: string; title: string }) {
  const { tr, kn, l } = useUiStrings();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function restore() {
    setBusy(true);
    setError("");
    try {
      const result = await restorePost(postId);
      if (result.error) {
        setError(l(result.error));
        return;
      }
      router.refresh();
    } catch {
      setError(kn.unavailable);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="delete-post">
      <button
        type="button"
        className="button button-outline is-compact"
        disabled={busy}
        aria-label={tr({ en: `Restore "${title}"`, kn: `"${title}" ಮರಳಿಸಿ`, hi: `"${title}" वापस लाएँ` })}
        onClick={restore}
      >
        <RotateCcw size={15} aria-hidden="true" />
        {tr({ en: "Restore", kn: "ಮರಳಿಸಿ", hi: "वापस लाएँ" })}
      </button>
      {error ? (
        <span className="delete-post-error" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
