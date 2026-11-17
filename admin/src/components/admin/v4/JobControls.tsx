"use client";
import { useState } from "react";
import { manageJob } from "@/app/admin/jobs/actions";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
export function JobControls({
  id,
  status,
  kind,
}: {
  id: string;
  status: string;
  kind: string;
}) {
  const { v4: t, tr } = useUiStrings();
  const [checked, setChecked] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  if (!["pending", "failed"].includes(status)) return null;
  async function run(action: "retry" | "cancel") {
    setBusy(true);
    try {
      const r = await manageJob({ id, action, checked });
      setMessage(r.error || t.saved);
    } catch {
      setMessage(
        tr({
          en: "Could not update job",
          kn: "ಕೆಲಸವನ್ನು ನವೀಕರಿಸಲಾಗಲಿಲ್ಲ",
          hi: "जॉब अपडेट नहीं हो सकी",
        }),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      {status === "failed" && kind !== "article-audio" && (
        <label className="poll-option">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          {tr({
            en: "I checked the provider; this delivery was not sent.",
            kn: "ನಾನು ಸೇವಾದಾರರಲ್ಲಿ ಪರಿಶೀಲಿಸಿದ್ದೇನೆ; ಈ ವಿತರಣೆ ಕಳುಹಿಸಲಾಗಿಲ್ಲ.",
            hi: "मैंने सेवा प्रदाता से जाँच की है; यह डिलीवरी नहीं भेजी गई।",
          })}
        </label>
      )}
      {status === "failed" && (
        <button
          className="chip"
          disabled={busy || (kind !== "article-audio" && !checked)}
          onClick={() => run("retry")}
        >
          {tr({ en: "Retry", kn: "ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ", hi: "फिर से कोशिश करें" })}
        </button>
      )}
      <button className="chip" disabled={busy} onClick={() => run("cancel")}>
        {tr({ en: "Cancel", kn: "ರದ್ದುಮಾಡಿ", hi: "रद्द करें" })}
      </button>
      <p role="status">{message}</p>
    </div>
  );
}
