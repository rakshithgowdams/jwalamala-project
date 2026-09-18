"use client";
import { CalendarReminder } from "@/components/engagement/CalendarReminder";
import { useUiStrings } from "@/components/i18n/LanguageProvider";

import { useState } from "react";
import { Bookmark, Check, Share2, Link as LinkIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { getBrowserClient } from "@/lib/supabase/client";
export function BookmarkButton({
  postId,
  href,
  iconOnly = false,
  initialSaved = false,
}: {
  postId: string;
  href: string;
  iconOnly?: boolean;
  initialSaved?: boolean;
}) {
  const { kn } = useUiStrings();

  const [saved, setSaved] = useState(initialSaved),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const router = useRouter();
  async function toggle() {
    setBusy(true);
    setError("");
    const db = getBrowserClient();
    if (!db) {
      router.push("/login?next=" + encodeURIComponent(href));
      return;
    }
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) {
      router.push("/login?next=" + encodeURIComponent(href));
      return;
    }
    const result = saved
      ? await db
          .from("bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", postId)
      : await db
          .from("bookmarks")
          .upsert({ user_id: user.id, post_id: postId });
    if (result.error) setError(kn.unavailable);
    else {
      setSaved(!saved);
      if (!saved)
        navigator.serviceWorker?.controller?.postMessage({
          type: "CACHE_ARTICLE",
          url: href,
        });
    }
    setBusy(false);
  }
  return (
    <span>
      <button
        type="button"
        className={iconOnly ? "icon-button bookmark" : "button button-outline"}
        aria-label={saved ? kn.saved : kn.save}
        aria-pressed={saved}
        disabled={busy}
        onClick={toggle}
      >
        {saved ? <Check size={17} /> : <Bookmark size={17} />}{" "}
        {!iconOnly && (saved ? kn.saved : kn.save)}
      </button>
      {error && <span role="status">{error}</span>}
    </span>
  );
}
export function ShareButtons({
  title,
  summary = "",
}: {
  title: string;
  summary?: string;
}) {
  const { kn } = useUiStrings();

  const [copied, setCopied] = useState(false);
  return (
    <div
      className="share-buttons"
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent("jwalamala-engagement", { detail: "share" }),
        )
      }
    >
      <button
        className="button whatsapp"
        onClick={() =>
          window.open(
            "https://wa.me/?text=" +
              encodeURIComponent(
                "*" +
                  title +
                  "*\n" +
                  summary.slice(0, 240) +
                  "\n" +
                  location.href,
              ),
            "_blank",
            "noopener,noreferrer",
          )
        }
      >
        <Share2 size={17} />
        WhatsApp
      </button>
      <button
        className="button button-outline"
        onClick={() =>
          window.open(
            "https://t.me/share/url?url=" +
              encodeURIComponent(location.href) +
              "&text=" +
              encodeURIComponent(title),
            "_blank",
            "noopener,noreferrer",
          )
        }
      >
        Telegram
      </button>
      <button
        className="button button-outline"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(location.href);
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
      >
        <LinkIcon size={17} />
        {copied ? kn.copied : kn.share}
      </button>
    </div>
  );
}
export function ReminderButton({ eventId }: { eventId: string }) {
  return <CalendarReminder id={eventId} event />;
}
