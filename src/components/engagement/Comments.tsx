"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { LoadingState } from "@/components/ui/LoadingState";
type Comment = {
  id: string;
  display_name: string;
  body: string;
  created_at: string;
};
export function Comments({ postId }: { postId: string }) {
  const { kn } = useUiStrings();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Comment[]>([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [report, setReport] = useState(""),
    router = useRouter();
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/comments?post=" + postId, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error("Unable to load comments");
        return r.json();
      })
      .then((d) => setRows(d.rows || []))
      .catch(() => {
        if (!controller.signal.aborted) setMessage(kn.commentsLoadFailed);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [postId, kn]);
  return (
    <section className="utility-panel">
      <h2>{kn.commentsHeading}</h2>
      {loading && <LoadingState kind="panel" />}
      <p>{kn.commentsNote}</p>
      {rows.map((c) => (
        <article key={c.id}>
          <strong>{c.display_name}</strong>
          <p style={{ whiteSpace: "pre-wrap" }}>{c.body}</p>
          <button className="chip" onClick={() => setReport(c.id)}>
            {kn.reportComment}
          </button>
          {report === c.id && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  const r = await fetch("/api/comments/report", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      id: c.id,
                      reason: new FormData(e.currentTarget).get("reason"),
                    }),
                  });
                  if (r.status === 401)
                    router.push(
                      "/login?next=" + encodeURIComponent(location.pathname),
                    );
                  setMessage(r.ok ? kn.reportSent : kn.reportFailed);
                  if (r.ok) setReport("");
                } catch {
                  setMessage(kn.connectionError);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label className="field">
                {kn.reason}
                <textarea
                  name="reason"
                  required
                  minLength={3}
                  maxLength={1000}
                />
              </label>
              <button className="button" disabled={busy}>
                {kn.send}
              </button>
            </form>
          )}
        </article>
      ))}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget,
            body = new FormData(form).get("body");
          setBusy(true);
          try {
            const r = await fetch("/api/comments", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ post_id: postId, body }),
            });
            if (r.status === 401) {
              router.push(
                "/login?next=" + encodeURIComponent(location.pathname),
              );
              return;
            }
            setMessage(
              r.ok
                ? kn.commentReceived
                : r.status === 429
                  ? kn.tryLater
                  : kn.commentFailed,
            );
            if (r.ok) form.reset();
          } catch {
            setMessage(kn.connectionError);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          {kn.yourComment}
          <textarea
            required
            name="body"
            minLength={3}
            maxLength={2000}
            rows={4}
          />
        </label>
        <button className="button button-ember" disabled={busy}>
          {kn.sendForReview}
        </button>
      </form>
      <p role="status">{message}</p>
    </section>
  );
}
