"use client";
import { useUiStrings } from "@/components/i18n/LanguageProvider";

import { useState } from "react";
import { Check, Plus } from "lucide-react";

import {
  useLocalValue,
  followSchema,
  FOLLOW_KEY,
  type LocalFollow,
} from "@/lib/v4/local-store";
import { getBrowserClient } from "@/lib/supabase/client";
import { site } from "@/config/site";
const empty: LocalFollow[] = [];
export function FollowButton({
  targetType,
  targetId,
  label,
}: {
  targetType: LocalFollow["target_type"];
  targetId: string;
  label: string;
}) {
  const { v4: t } = useUiStrings();

  const [follows, setFollows] = useLocalValue(FOLLOW_KEY, followSchema, empty);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const followed = follows.some(
    (f) => f.target_type === targetType && f.target_id === targetId,
  );
  async function toggle() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    const updated = followed
      ? follows.filter(
          (f) => f.target_type !== targetType || f.target_id !== targetId,
        )
      : [
          ...follows,
          { target_type: targetType, target_id: targetId, label_kn: label },
        ];
    try {
      const db = site.demo ? null : getBrowserClient();
      const user = db ? (await db.auth.getUser()).data.user : null;
      if (db && user) {
        const result = followed
          ? await db
              .from("follows")
              .delete()
              .eq("user_id", user.id)
              .eq("target_type", targetType)
              .eq("target_id", targetId)
          : await db.from("follows").upsert({
              user_id: user.id,
              target_type: targetType,
              target_id: targetId,
              label_kn: label,
            });
        if (result.error) throw result.error;
      } else setMessage(t.localFollow);
      setFollows(updated);
    } catch {
      setMessage(t.failed);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="follow-control">
      <button
        type="button"
        className={"button " + (followed ? "button-outline" : "button-ember")}
        aria-pressed={followed}
        disabled={busy}
        onClick={toggle}
      >
        {followed ? <Check size={17} /> : <Plus size={17} />}{" "}
        {followed ? t.following : t.follow}
      </button>
      {message && (
        <p className="meta" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
