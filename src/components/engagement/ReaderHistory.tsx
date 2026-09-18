"use client";
import { useUiStrings } from "@/components/i18n/LanguageProvider";

import Link from "next/link";
import { useState } from "react";
import { site } from "@/config/site";
import { getBrowserClient } from "@/lib/supabase/client";

import {
  useLocalValue,
  historySchema,
  HISTORY_KEY,
  followSchema,
  FOLLOW_KEY,
} from "@/lib/v4/local-store";
const empty: never[] = [];
export function ReaderHistory() {
  const { v4: t } = useUiStrings();

  const [message, setMessage] = useState("");
  const [history, setHistory] = useLocalValue(
    HISTORY_KEY,
    historySchema,
    empty,
  );
  const [follows] = useLocalValue(FOLLOW_KEY, followSchema, empty);
  return (
    <div className="reader-history">
      <p role="status">{message}</p>
      <section>
        <div className="section-title">
          <h2>{t.history}</h2>
          <button
            className="chip"
            onClick={async () => {
              try {
                const db = site.demo ? null : getBrowserClient();
                if (db) {
                  const {
                    data: { user },
                  } = await db.auth.getUser();
                  if (user) {
                    const { error } = await db
                      .from("reading_history")
                      .delete()
                      .eq("user_id", user.id);
                    if (error) throw error;
                  }
                }
                setHistory([]);
              } catch {
                setMessage(t.syncFailed);
              }
            }}
          >
            {t.clearHistory}
          </button>
        </div>
        {history.length ? (
          history.map((item) => (
            <Link className="directory-link" key={item.id} href={item.href}>
              {item.title}
            </Link>
          ))
        ) : (
          <p>{t.readingHistoryEmpty}</p>
        )}
      </section>
      <section>
        <h2>{t.following}</h2>
        {follows.map((item) => (
          <p key={item.target_type + item.target_id}>{item.label_kn}</p>
        ))}
        {!follows.length && <p>{t.noFollow}</p>}
      </section>
    </div>
  );
}
