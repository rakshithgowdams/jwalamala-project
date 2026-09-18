"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  moderateComment,
  blockCommenter,
  saveComments,
} from "@/app/admin/comments/actions";
export function CommentModeration({
  rows,
  reports,
  config,
  canConfigure,
}: {
  rows: {
    id: string;
    user_id: string;
    display_name: string;
    body: string;
    status: string;
    flagged: boolean;
  }[];
  reports: { comment_id: string; reason: string }[];
  config: { enabled: boolean; blocked_words: string[]; slow_seconds: number };
  canConfigure: boolean;
}) {
  const [message, setMessage] = useState(""),
    [busy, start] = useTransition(),
    router = useRouter();
  function run(action: () => Promise<{ error?: string }>) {
    start(async () => {
      try {
        const r = await action();
        setMessage(r.error || "ಉಳಿಸಲಾಗಿದೆ.");
        router.refresh();
      } catch {
        setMessage("ಉಳಿಸಲಾಗಲಿಲ್ಲ.");
      }
    });
  }
  return (
    <>
      {canConfigure && (
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            run(() =>
              saveComments({
                enabled: f.has("enabled"),
                slow_seconds: Number(f.get("slow_seconds")),
                blocked_words: String(f.get("blocked_words"))
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              }),
            );
          }}
        >
          <label className="chip">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={config.enabled}
            />
            ಅಭಿಪ್ರಾಯಗಳನ್ನು ಸಕ್ರಿಯಗೊಳಿಸಿ
          </label>
          <label className="field">
            ಎರಡು ಅಭಿಪ್ರಾಯಗಳ ನಡುವಿನ ಸೆಕೆಂಡ್‌ಗಳು
            <input
              type="number"
              name="slow_seconds"
              min="30"
              max="3600"
              defaultValue={config.slow_seconds}
            />
          </label>
          <label className="field wide">
            ಪರಿಶೀಲನೆಗೆ ಗುರುತಿಸುವ ಪದಗಳು (ಕನ್ನಡ / English, ಸಾಲಿಗೆ ಒಂದು)
            <textarea
              name="blocked_words"
              defaultValue={config.blocked_words.join("\n")}
            />
          </label>
          <button className="button" disabled={busy}>
            ಸಂಯೋಜನೆ ಉಳಿಸಿ
          </button>
        </form>
      )}
      <p role="status">{message}</p>
      {rows.map((r) => (
        <article className="utility-panel" key={r.id}>
          <strong>
            {r.display_name} · {r.status}
            {r.flagged ? " · ಗುರುತಿಸಲಾಗಿದೆ" : ""}
          </strong>
          <p>{r.body}</p>
          {reports
            .filter((report) => report.comment_id === r.id)
            .map((report, i) => (
              <p className="notice" key={i}>
                ವರದಿ: {report.reason}
              </p>
            ))}
          <div className="category-chips">
            <button
              className="button"
              disabled={busy}
              onClick={() => run(() => moderateComment(r.id, "approved"))}
            >
              ಅನುಮೋದಿಸಿ
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => run(() => moderateComment(r.id, "rejected"))}
            >
              ತಿರಸ್ಕರಿಸಿ
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => run(() => blockCommenter(r.user_id))}
            >
              ಈ ಓದುಗರ ಅಭಿಪ್ರಾಯಗಳನ್ನು ಮರೆಮಾಡಿ
            </button>
          </div>
        </article>
      ))}
    </>
  );
}
