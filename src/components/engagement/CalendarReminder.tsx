"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
export function CalendarReminder({
  id,
  demo = false,
  event = false,
}: {
  id: string;
  demo?: boolean;
  event?: boolean;
}) {
  const { kn } = useUiStrings();
  const [done, setDone] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter();
  const table = event ? "event_reminders" : "calendar_reminders",
    column = event ? "event_id" : "day_id";
  useEffect(() => {
    let active = true;
    const db = getBrowserClient();
    if (db && !demo)
      void db.auth
        .getUser()
        .then(async ({ data }) => {
          if (!data.user) return;
          let query = db
            .from(table)
            .select(column)
            .eq("user_id", data.user.id)
            .eq(column, id);
          if (event) query = query.eq("channel", "push");
          const { data: rows } = await query;
          if (active) setDone(!!rows?.length);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [table, column, id, demo, event]);
  if (demo) return null;
  return (
    <div>
      <button
        className="chip"
        disabled={busy}
        aria-pressed={done}
        onClick={async () => {
          setBusy(true);
          try {
            const db = getBrowserClient(),
              user = db ? (await db.auth.getUser()).data.user : null;
            if (!db || !user) {
              router.push(
                "/login?next=" + encodeURIComponent(location.pathname),
              );
              return;
            }
            if (done) {
              let query = db
                .from(table)
                .delete()
                .eq("user_id", user.id)
                .eq(column, id);
              if (event) query = query.eq("channel", "push");
              const { error } = await query;
              if (error) throw error;
            } else {
              const { error } = await db.from(table).upsert(
                {
                  user_id: user.id,
                  [column]: id,
                  ...(event ? { channel: "push" } : {}),
                },
                {
                  onConflict: event
                    ? "user_id,event_id,channel"
                    : "user_id,day_id",
                  ignoreDuplicates: true,
                },
              );
              if (error) throw error;
            }
            setDone(!done);
            router.refresh();
          } catch {
            setMessage(kn.unavailable);
          } finally {
            setBusy(false);
          }
        }}
      >
        {done ? kn.cancelReminder : kn.remind}
      </button>
      {done && (
        <Link className="chip" href="/account?tab=notifications">
          {kn.notificationSettings}
        </Link>
      )}
      <p role="status">{message}</p>
    </div>
  );
}
