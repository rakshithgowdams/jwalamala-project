"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewContributor } from "@/app/admin/contributors/actions";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
export function ContributorReviews({
  rows,
}: {
  rows: { user_id: string; note: string; status: string; place_id: string }[];
}) {
  const { v4: t, tr } = useUiStrings();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <>
      <p role="status">{message}</p>
      {rows.map((r) => (
        <article className="utility-panel" key={r.user_id}>
          <p>
            {r.user_id} · {r.status}
          </p>
          <p>{r.note}</p>
          <p>
            {tr({
              en: "Assigned place: ",
              kn: "ನಿಯೋಜಿತ ಸ್ಥಳ: ",
              hi: "सौंपा गया स्थान: ",
            })}
            {r.place_id}
          </p>
          {(["approved", "rejected"] as const).map((decision) => (
            <button
              key={decision}
              className="chip"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const result = await reviewContributor(r.user_id, decision);
                  setMessage(result.error || t.saved);
                  router.refresh();
                } catch {
                  setMessage(
                    tr({
                      en: "Review failed",
                      kn: "ಪರಿಶೀಲನೆ ವಿಫಲವಾಯಿತು",
                      hi: "समीक्षा विफल रही",
                    }),
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {decision === "approved"
                ? tr({
                    en: "Approve contributor",
                    kn: "ವರದಿಗಾರರನ್ನು ಅನುಮೋದಿಸಿ",
                    hi: "योगदानकर्ता को स्वीकृत करें",
                  })
                : tr({
                    en: "Reject / revoke approval",
                    kn: "ತಿರಸ್ಕರಿಸಿ / ಅನುಮೋದನೆ ಹಿಂಪಡೆಯಿರಿ",
                    hi: "अस्वीकार करें / स्वीकृति वापस लें",
                  })}
            </button>
          ))}
        </article>
      ))}
    </>
  );
}
