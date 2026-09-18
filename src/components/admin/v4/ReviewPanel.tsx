"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import {
  addReviewComment,
  restoreVersion,
  resolveReviewComment,
} from "@/app/admin/desk/actions";
import { v4 as t, kn } from "@/content/strings.kn";
export function ReviewPanel({
  postId,
  versions,
  comments,
  current,
}: {
  postId: string;
  current: { title_kn: string; body_html: string };
  versions: {
    id: string;
    created_at: string;
    snapshot: { title_kn: string; body_html: string };
  }[];
  comments: {
    id: string;
    body: string;
    paragraph_index: number | null;
    resolved: boolean;
  }[];
}) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    router = useRouter();
  useEffect(() => {
    const db = getBrowserClient();
    if (!db) return;
    let active = true;
    const lock = async () => {
      const { data, error } = await db.rpc("lock_v4_post", { target: postId });
      if (active && (error || data === false)) setMessage(t.locked);
    };
    void lock();
    const timer = window.setInterval(lock, 120000);
    return () => {
      active = false;
      window.clearInterval(timer);
      void db
        .rpc("lock_v4_post", { target: postId, release: true })
        .then(() => {});
    };
  }, [postId]);
  return (
    <section className="utility-panel">
      <h2>{t.reviewNote}</h2>
      <p role="status">{message}</p>
      {message === t.locked && (
        <button
          type="button"
          className="button button-outline"
          onClick={async () => {
            const db = getBrowserClient();
            if (!db) return;
            const { data, error } = await db.rpc("lock_v4_post", {
              target: postId,
              takeover: true,
            });
            setMessage(!error && data ? t.saved : t.locked);
          }}
        >
          Administrator: take over editing lock
        </button>
      )}
      {comments.map((c) => (
        <blockquote key={c.id}>
          {c.paragraph_index !== null && (
            <span>¶{c.paragraph_index + 1} · </span>
          )}
          {c.body}
          <button
            className="chip"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await resolveReviewComment(c.id, !c.resolved);
                setMessage(r.error || t.saved);
                router.refresh();
              } catch {
                setMessage(t.failed);
              } finally {
                setBusy(false);
              }
            }}
          >
            {c.resolved ? "Reopen" : "Resolve"}
          </button>
        </blockquote>
      ))}
      <form
        className="form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setBusy(true);
          try {
            const result = await addReviewComment(
              postId,
              String(f.get("body")),
              String(f.get("paragraph")),
            );
            setMessage(result.error || t.saved);
            router.refresh();
          } catch {
            setMessage(t.failed);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field wide">
          {t.reviewNote}
          <textarea name="body" required maxLength={3000} />
        </label>
        <label className="field">
          {t.paragraph}
          <input name="paragraph" type="number" min={0} />
        </label>
        <button disabled={busy} className="button button-outline">
          {kn.save}
        </button>
      </form>
      <h2>{t.versions}</h2>
      {versions.map((v) => (
        <details key={v.id}>
          <summary>
            {new Date(v.created_at).toLocaleString("kn-IN", {
              timeZone: "Asia/Kolkata",
            })}{" "}
            · {v.snapshot.title_kn}
          </summary>
          <div className="community-grid">
            <section>
              <h3>Selected version</h3>
              <pre className="version-source">
                {v.snapshot.title_kn + "\n" + v.snapshot.body_html}
              </pre>
            </section>
            <section>
              <h3>Current version</h3>
              <pre className="version-source">
                {current.title_kn + "\n" + current.body_html}
              </pre>
            </section>
          </div>
          <p className="meta">
            {v.snapshot.body_html === current.body_html &&
            v.snapshot.title_kn === current.title_kn
              ? "Text is unchanged"
              : "Text differs from the current version"}
          </p>
          <button
            disabled={busy}
            className="button button-outline"
            onClick={async () => {
              setBusy(true);
              try {
                const result = await restoreVersion(v.id);
                setMessage(result.error || t.saved);
                if (!result.error) window.location.reload();
              } catch {
                setMessage(t.failed);
              } finally {
                setBusy(false);
              }
            }}
          >
            {t.restore}
          </button>
        </details>
      ))}
    </section>
  );
}
