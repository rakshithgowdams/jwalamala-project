"use client";
import { useState } from "react";
import { createSponsorReview } from "@/app/admin/sponsor/actions";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
export function SponsorReview({ postId }: { postId: string }) {
  const { tr } = useUiStrings();
  const [url, setUrl] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section className="utility-panel">
      <h2>
        {tr({
          en: "Sponsor approval",
          kn: "ಪ್ರಾಯೋಜಕರ ಅನುಮೋದನೆ",
          hi: "प्रायोजक की स्वीकृति",
        })}
      </h2>
      <p>
        {tr({
          en: "Approval applies only to the saved version. The link is valid for 7 days.",
          kn: "ಉಳಿಸಿದ ಆವೃತ್ತಿಗೆ ಮಾತ್ರ ಅನುಮೋದನೆ ಅನ್ವಯಿಸುತ್ತದೆ. ಲಿಂಕ್ 7 ದಿನಗಳಿಗೆ ಮಾನ್ಯ.",
          hi: "स्वीकृति केवल सहेजे गए संस्करण पर लागू होती है। लिंक 7 दिनों के लिए मान्य है।",
        })}
      </p>
      <button
        className="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await createSponsorReview(postId);
            setUrl(r.url || "");
            setMessage(
              r.error ||
                tr({
                  en: "Review link is ready.",
                  kn: "ಪರಿಶೀಲನಾ ಲಿಂಕ್ ಸಿದ್ಧವಾಗಿದೆ.",
                  hi: "समीक्षा लिंक तैयार है।",
                }),
            );
          } catch {
            setMessage(
              tr({
                en: "Service unavailable.",
                kn: "ಸೇವೆ ಲಭ್ಯವಿಲ್ಲ.",
                hi: "सेवा उपलब्ध नहीं है।",
              }),
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {tr({
          en: "Prepare review link",
          kn: "ಪರಿಶೀಲನಾ ಲಿಂಕ್ ಸಿದ್ಧಪಡಿಸಿ",
          hi: "समीक्षा लिंक तैयार करें",
        })}
      </button>
      {url && (
        <label className="field">
          {tr({
            en: "Link to share with the sponsor",
            kn: "ಪ್ರಾಯೋಜಕರಿಗೆ ಹಂಚುವ ಲಿಂಕ್",
            hi: "प्रायोजक के साथ साझा करने का लिंक",
          })}
          <input readOnly value={url} />
        </label>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
