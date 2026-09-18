"use client";
import { useEffect } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import { site } from "@/config/site";
import {
  followSchema,
  historySchema,
  FOLLOW_KEY,
  HISTORY_KEY,
} from "@/lib/v4/local-store";
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function ReaderSync() {
  useEffect(() => {
    if (site.demo) return;
    const db = getBrowserClient();
    if (!db) return;
    let cancelled = false,
      busy = false;
    async function sync() {
      if (busy || !db) return;
      busy = true;
      try {
        const {
          data: { user },
        } = await db.auth.getUser();
        if (!user) return;
        const owner = localStorage.getItem("jwalamala-reader-owner"),
          guest = owner === null;
        const follows = followSchema
            .catch([])
            .parse(JSON.parse(localStorage.getItem(FOLLOW_KEY) || "[]")),
          history = historySchema
            .catch([])
            .parse(JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"));
        if (guest) {
          const valid = follows.filter((f) => uuid.test(f.target_id));
          if (valid.length) {
            const { error } = await db
              .from("follows")
              .upsert(valid.map((f) => ({ ...f, user_id: user.id })));
            if (error) return;
          }
          const viewed = history.filter((h) => uuid.test(h.id));
          if (viewed.length) {
            const { error } = await db.from("reading_history").upsert(
              viewed.map((h) => ({
                user_id: user.id,
                post_id: h.id,
                last_viewed_at: h.viewed_at,
              })),
            );
            if (error) return;
          }
        }
        const [remoteFollows, remoteHistory] = await Promise.all([
          db
            .from("follows")
            .select("target_type,target_id,label_kn")
            .eq("user_id", user.id)
            .limit(500),
          db
            .from("reading_history")
            .select("post_id,last_viewed_at,posts(slug,type,title_kn)")
            .eq("user_id", user.id)
            .order("last_viewed_at", { ascending: false })
            .limit(200),
        ]);
        if (cancelled || remoteFollows.error || remoteHistory.error) return;
        localStorage.setItem(
          FOLLOW_KEY,
          JSON.stringify(remoteFollows.data || []),
        );
        localStorage.setItem(
          HISTORY_KEY,
          JSON.stringify(
            (remoteHistory.data || []).flatMap((row) => {
              const post = row.posts as unknown as {
                slug: string;
                type: string;
                title_kn: string;
              } | null;
              return post
                ? [
                    {
                      id: row.post_id,
                      title: post.title_kn,
                      href:
                        "/" +
                        (post.type === "article" ? "news" : "video") +
                        "/" +
                        post.slug,
                      viewed_at: row.last_viewed_at,
                    },
                  ]
                : [];
            }),
          ),
        );
        localStorage.setItem("jwalamala-reader-owner", user.id);
        window.dispatchEvent(new Event("jwalamala-local"));
      } catch {
        /* Keep local data when offline. */
      } finally {
        busy = false;
      }
    }
    const timer = setTimeout(sync, 0);
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") setTimeout(sync, 0);
      if (event === "SIGNED_OUT") {
        try {
          localStorage.removeItem(FOLLOW_KEY);
          localStorage.removeItem(HISTORY_KEY);
          localStorage.removeItem("jwalamala-watch-history");
          localStorage.removeItem("jwalamala-reader-owner");
          window.dispatchEvent(new Event("jwalamala-local"));
        } catch {}
      }
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);
  return null;
}
