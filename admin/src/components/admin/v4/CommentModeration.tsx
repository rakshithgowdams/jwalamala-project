"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  moderateComment,
  blockCommenter,
  saveComments,
} from "@/app/admin/comments/actions";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
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
  const { tr } = useUiStrings();
  const [message, setMessage] = useState(""),
    [busy, start] = useTransition(),
    router = useRouter();
  function run(action: () => Promise<{ error?: string }>) {
    start(async () => {
      try {
        const r = await action();
        setMessage(
          r.error || tr({ en: "Saved.", kn: "ಉಳಿಸಲಾಗಿದೆ.", hi: "सहेजा गया।" }),
        );
        router.refresh();
      } catch {
        setMessage(
          tr({
            en: "Could not save.",
            kn: "ಉಳಿಸಲಾಗಲಿಲ್ಲ.",
            hi: "सहेजा नहीं जा सका।",
          }),
        );
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
            {tr({
              en: "Enable comments",
              kn: "ಅಭಿಪ್ರಾಯಗಳನ್ನು ಸಕ್ರಿಯಗೊಳಿಸಿ",
              hi: "टिप्पणियाँ सक्रिय करें",
            })}
          </label>
          <label className="field">
            {tr({
              en: "Seconds between two comments",
              kn: "ಎರಡು ಅಭಿಪ್ರಾಯಗಳ ನಡುವಿನ ಸೆಕೆಂಡ್‌ಗಳು",
              hi: "दो टिप्पणियों के बीच सेकंड",
            })}
            <input
              type="number"
              name="slow_seconds"
              min="30"
              max="3600"
              defaultValue={config.slow_seconds}
            />
          </label>
          <label className="field wide">
            {tr({
              en: "Words that flag for review (Kannada / English, one per line)",
              kn: "ಪರಿಶೀಲನೆಗೆ ಗುರುತಿಸುವ ಪದಗಳು (ಕನ್ನಡ / English, ಸಾಲಿಗೆ ಒಂದು)",
              hi: "समीक्षा के लिए चिह्नित करने वाले शब्द (कन्नड़ / English, प्रति पंक्ति एक)",
            })}
            <textarea
              name="blocked_words"
              defaultValue={config.blocked_words.join("\n")}
            />
          </label>
          <button className="button" disabled={busy}>
            {tr({
              en: "Save settings",
              kn: "ಸಂಯೋಜನೆ ಉಳಿಸಿ",
              hi: "सेटिंग्स सहेजें",
            })}
          </button>
        </form>
      )}
      <p role="status">{message}</p>
      {rows.map((r) => (
        <article className="utility-panel" key={r.id}>
          <strong>
            {r.display_name} · {r.status}
            {r.flagged
              ? tr({
                  en: " · Flagged",
                  kn: " · ಗುರುತಿಸಲಾಗಿದೆ",
                  hi: " · चिह्नित",
                })
              : ""}
          </strong>
          <p>{r.body}</p>
          {reports
            .filter((report) => report.comment_id === r.id)
            .map((report, i) => (
              <p className="notice" key={i}>
                {tr({ en: "Report:", kn: "ವರದಿ:", hi: "रिपोर्ट:" })}{" "}
                {report.reason}
              </p>
            ))}
          <div className="category-chips">
            <button
              className="button"
              disabled={busy}
              onClick={() => run(() => moderateComment(r.id, "approved"))}
            >
              {tr({ en: "Approve", kn: "ಅನುಮೋದಿಸಿ", hi: "स्वीकृत करें" })}
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => run(() => moderateComment(r.id, "rejected"))}
            >
              {tr({ en: "Reject", kn: "ತಿರಸ್ಕರಿಸಿ", hi: "अस्वीकार करें" })}
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => run(() => blockCommenter(r.user_id))}
            >
              {tr({
                en: "Hide this reader's comments",
                kn: "ಈ ಓದುಗರ ಅಭಿಪ್ರಾಯಗಳನ್ನು ಮರೆಮಾಡಿ",
                hi: "इस पाठक की टिप्पणियाँ छिपाएँ",
              })}
            </button>
          </div>
        </article>
      ))}
    </>
  );
}
