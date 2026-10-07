"use client";
import { useState } from "react";
import { createSponsorReview } from "@/app/admin/sponsor/actions";
export function SponsorReview({ postId }: { postId: string }) {
  const [url, setUrl] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section className="utility-panel">
      <h2>ಪ್ರಾಯೋಜಕರ ಅನುಮೋದನೆ</h2>
      <p>
        ಉಳಿಸಿದ ಆವೃತ್ತಿಗೆ ಮಾತ್ರ ಅನುಮೋದನೆ ಅನ್ವಯಿಸುತ್ತದೆ. ಲಿಂಕ್ 7 ದಿನಗಳಿಗೆ ಮಾನ್ಯ.
      </p>
      <button
        className="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await createSponsorReview(postId);
            setUrl(r.url || "");
            setMessage(r.error || "ಪರಿಶೀಲನಾ ಲಿಂಕ್ ಸಿದ್ಧವಾಗಿದೆ.");
          } catch {
            setMessage("ಸೇವೆ ಲಭ್ಯವಿಲ್ಲ.");
          } finally {
            setBusy(false);
          }
        }}
      >
        ಪರಿಶೀಲನಾ ಲಿಂಕ್ ಸಿದ್ಧಪಡಿಸಿ
      </button>
      {url && (
        <label className="field">
          ಪ್ರಾಯೋಜಕರಿಗೆ ಹಂಚುವ ಲಿಂಕ್
          <input readOnly value={url} />
        </label>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
